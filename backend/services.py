"""
backend/services.py
Core Business Logic Services for Warehouse Inventory System:
- Database seeding from synthetic CSV datasets
- Dashboard metrics and analytics chart aggregation
- AI Reorder Plan generation with supplier consolidation & budget trade-offs
- Stock count campaigns & Purchase Order lifecycle execution
"""

import os
import math
import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.models import (
    Category, Supplier, Location, Product, Inventory,
    Transaction, PurchaseOrder, PurchaseOrderItem,
    StockCount, StockCountItem, Prediction, Alert,
    ReorderRecommendation
)
from backend.agents import MultiAgentSystem, agent_tracker
from backend.websocket_manager import ws_manager

logger = logging.getLogger("warehouse_services")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

from backend.database import Base, engine

def seed_database_from_csv(db: Session):
    """Initializes SQLite database tables from generated CSV files if empty."""
    Base.metadata.create_all(bind=engine)
    if db.query(Product).count() > 0:
        logger.info("Database already seeded with products. Skipping initial seed.")
        return

    logger.info("Seeding database from CSV files...")
    
    # 1. Categories
    cat_file = os.path.join(DATA_DIR, "categories.csv")
    if os.path.exists(cat_file):
        df_cat = pd.read_csv(cat_file)
        for _, r in df_cat.iterrows():
            cat = Category(id=int(r["id"]), name=r["name"], description=r.get("description", ""))
            db.add(cat)
        db.commit()

    # 2. Suppliers
    sup_file = os.path.join(DATA_DIR, "suppliers.csv")
    if os.path.exists(sup_file):
        df_sup = pd.read_csv(sup_file)
        for _, r in df_sup.iterrows():
            sup = Supplier(
                id=int(r["id"]),
                supplier_code=r["supplier_code"],
                name=r["name"],
                contact_person=r.get("contact_person", ""),
                email=r.get("email", ""),
                phone=r.get("phone", ""),
                address=r.get("address", ""),
                lead_time_days=int(r.get("lead_time_days", 7)),
                minimum_order_amount=float(r.get("minimum_order_amount", 0.0)),
                reliability_rating=float(r.get("reliability_rating", 0.95))
            )
            db.add(sup)
        db.commit()

    # 3. Locations
    loc_file = os.path.join(DATA_DIR, "locations.csv")
    if os.path.exists(loc_file):
        df_loc = pd.read_csv(loc_file)
        for _, r in df_loc.iterrows():
            loc = Location(
                id=int(r["id"]),
                name=r["name"],
                code=r["code"],
                type=r["type"],
                address=r.get("address", "")
            )
            db.add(loc)
        db.commit()

    # 4. Products
    prod_file = os.path.join(DATA_DIR, "products.csv")
    if os.path.exists(prod_file):
        df_prod = pd.read_csv(prod_file)
        for _, r in df_prod.iterrows():
            prod = Product(
                id=int(r["id"]),
                sku=r["sku"],
                barcode=r["barcode"],
                name=r["name"],
                category_id=int(r["category_id"]),
                supplier_id=int(r["supplier_id"]),
                unit=r.get("unit", "Units"),
                unit_cost=float(r["unit_cost"]),
                selling_price=float(r["selling_price"]),
                reorder_point=int(r["reorder_point"]),
                reorder_quantity=int(r["reorder_quantity"]),
                lead_time_days=int(r["lead_time_days"]),
                safety_stock=int(r["safety_stock"])
            )
            db.add(prod)
        db.commit()

    # 5. Initialize Inventory Balances across 8 locations
    # Healthy baseline distribution
    products = db.query(Product).all()
    locations = db.query(Location).all()
    for p in products:
        for loc in locations:
            if p.id == 1:
                # Laptop initial stock = 50 total (Section 18 requirement)
                qty = 50 if loc.id == 1 else 0
            elif p.id == 2:
                # Mouse initial stock = 45 total (reorder point = 40)
                qty = 45 if loc.id == 1 else 0
            elif p.id == 3:
                # Keyboard initial stock = 60 total (reorder point = 50)
                qty = 60 if loc.id == 1 else 0
            else:
                if loc.id == 1: # Primary warehouse holds ~60%
                    qty = int(p.reorder_point * 2.5)
                elif loc.id in [2, 3, 4]:
                    qty = int(p.reorder_point * 1.2)
                else:
                    qty = int(p.safety_stock * 1.0)
            inv = Inventory(product_id=p.id, location_id=loc.id, quantity=qty)
            db.add(inv)
    db.commit()

    # 6. Run initial Multi-Agent evaluation across all products
    logger.info("Initializing multi-agent baseline evaluation for all SKUs...")
    agent_sys = MultiAgentSystem(db)
    for p in products:
        agent_sys.process_and_evaluate(product_id=p.id)

    logger.info(f"Database seed completed successfully with {len(products)} products and initial agent state.")

def get_product_stock_total(db: Session, product_id: int) -> int:
    val = db.query(func.sum(Inventory.quantity)).filter(Inventory.product_id == product_id).scalar()
    return int(val or 0)

def get_all_products_enriched(db: Session) -> List[Dict[str, Any]]:
    products = db.query(Product).all()
    results = []
    for p in products:
        stock = get_product_stock_total(db, p.id)
        latest_pred = db.query(Prediction).filter(Prediction.product_id == p.id).order_by(desc(Prediction.created_at)).first()

        status = "IN STOCK"
        if stock == 0:
            status = "OUT OF STOCK"
        elif stock <= p.reorder_point:
            status = "LOW STOCK"

        margin = round(((p.selling_price - p.unit_cost) / p.selling_price) * 100, 1) if p.selling_price > 0 else 0.0

        results.append({
            "id": p.id,
            "sku": p.sku,
            "barcode": p.barcode,
            "name": p.name,
            "category_id": p.category_id,
            "category_name": p.category.name if p.category else "",
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.name if p.supplier else "",
            "unit": p.unit,
            "unit_cost": p.unit_cost,
            "selling_price": p.selling_price,
            "margin": margin,
            "reorder_point": p.reorder_point,
            "reorder_quantity": p.reorder_quantity,
            "lead_time_days": p.lead_time_days,
            "safety_stock": p.safety_stock,
            "current_stock": stock,
            "stock_status": status,
            "latest_prediction": {
                "predicted_demand": latest_pred.predicted_demand,
                "short_term_demand": latest_pred.short_term_demand,
                "stockout_risk": latest_pred.stockout_risk,
                "inventory_status": latest_pred.inventory_status,
                "recommended_reorder_quantity": latest_pred.recommended_reorder_quantity,
                "recommendation": latest_pred.recommendation,
                "created_at": latest_pred.created_at.strftime("%Y-%m-%d %H:%M:%S")
            } if latest_pred else None
        })
    return results

def get_dashboard_data(db: Session) -> Dict[str, Any]:
    """Computes comprehensive dashboard summary stats and chart datasets."""
    products = db.query(Product).all()
    total_skus = len(products)
    
    # Stock values and counts
    stock_value = 0.0
    low_stock_count = 0
    out_of_stock_count = 0
    
    for p in products:
        st = get_product_stock_total(db, p.id)
        stock_value += st * p.unit_cost
        if st == 0:
            out_of_stock_count += 1
        elif st <= p.reorder_point:
            low_stock_count += 1

    # Open PO stats
    open_pos = db.query(PurchaseOrder).filter(PurchaseOrder.status.in_(["ORDERED", "PARTIALLY_RECEIVED", "DRAFT"])).all()
    open_po_count = len(open_pos)
    open_po_value = sum(po.total_amount for po in open_pos)

    # 30-day transaction count
    t30 = datetime.utcnow() - timedelta(days=30)
    tx_30d = db.query(Transaction).filter(Transaction.timestamp >= t30).count()

    # Predictions aggregation
    latest_preds = []
    high_risk_count = 0
    pending_reorders_count = 0
    total_predicted_demand = 0.0

    for p in products:
        lp = db.query(Prediction).filter(Prediction.product_id == p.id).order_by(desc(Prediction.created_at)).first()
        if lp:
            latest_preds.append(lp)
            total_predicted_demand += lp.predicted_demand
            if lp.stockout_risk == "HIGH":
                high_risk_count += 1
            if lp.recommendation in ["REORDER NOW", "REORDER SOON"]:
                pending_reorders_count += 1

    # Recent Alerts (last 10)
    alerts_query = db.query(Alert).order_by(desc(Alert.timestamp)).limit(10).all()
    recent_alerts = [
        {
            "id": a.id,
            "product_id": a.product_id,
            "product_name": a.product.name if a.product else None,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "is_read": a.is_read
        }
        for a in alerts_query
    ]

    # Recent Transactions (last 10)
    tx_query = db.query(Transaction).order_by(desc(Transaction.timestamp)).limit(10).all()
    recent_transactions = [
        {
            "id": t.id,
            "transaction_id": t.transaction_id,
            "product_id": t.product_id,
            "product_name": t.product.name if t.product else f"Product {t.product_id}",
            "sku": t.product.sku if t.product else "",
            "source_location": t.source_location,
            "source_location_name": t.src_loc.name if t.src_loc else None,
            "destination_location": t.destination_location,
            "destination_location_name": t.dest_loc.name if t.dest_loc else None,
            "transaction_type": t.transaction_type,
            "quantity": t.quantity,
            "previous_stock": t.previous_stock,
            "new_stock": t.new_stock,
            "reason": t.reason,
            "reference_number": t.reference_number,
            "note": t.note,
            "timestamp": t.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }
        for t in tx_query
    ]

    # -----------------------------
    # 7 Dashboard Charts Data
    # -----------------------------
    # Chart 1: Daily Transaction Volume (past 14 days)
    chart1_data = []
    for d in range(13, -1, -1):
        day_date = (datetime.utcnow() - timedelta(days=d)).date()
        next_day = day_date + timedelta(days=1)
        cnt = db.query(Transaction).filter(
            Transaction.timestamp >= datetime.combine(day_date, datetime.min.time()),
            Transaction.timestamp < datetime.combine(next_day, datetime.min.time())
        ).count()
        chart1_data.append({"date": day_date.strftime("%b %d"), "transactions": cnt})

    # Chart 2: Sales/Demand Trend by Transaction Type
    chart2_data = []
    for t_type in ["SALE", "ISSUE", "RECEIVE", "TRANSFER", "ADJUST", "RETURN"]:
        qty = db.query(func.sum(Transaction.quantity)).filter(Transaction.transaction_type == t_type).scalar() or 0
        chart2_data.append({"type": t_type, "quantity": int(qty)})

    # Chart 3: Inventory by Category
    chart3_data = []
    categories = db.query(Category).all()
    for cat in categories:
        prod_ids = [p.id for p in cat.products]
        if prod_ids:
            cat_qty = db.query(func.sum(Inventory.quantity)).filter(Inventory.product_id.in_(prod_ids)).scalar() or 0
        else:
            cat_qty = 0
        chart3_data.append({"category": cat.name, "units": int(cat_qty)})

    # Chart 4: Inventory by Location
    chart4_data = []
    locations = db.query(Location).all()
    for loc in locations:
        loc_qty = db.query(func.sum(Inventory.quantity)).filter(Inventory.location_id == loc.id).scalar() or 0
        chart4_data.append({"location": loc.code, "name": loc.name, "units": int(loc_qty)})

    # Chart 5: Predicted vs Actual Demand (Top 8 high-velocity items)
    chart5_data = []
    for p in products[:8]:
        pred = db.query(Prediction).filter(Prediction.product_id == p.id).order_by(desc(Prediction.created_at)).first()
        actual_sold_30d = db.query(func.sum(Transaction.quantity)).filter(
            Transaction.product_id == p.id,
            Transaction.transaction_type.in_(["SALE", "ISSUE"]),
            Transaction.timestamp >= t30
        ).scalar() or 0
        chart5_data.append({
            "product": p.name[:18],
            "predicted": round(pred.predicted_demand, 1) if pred else 0,
            "actual_sales": int(actual_sold_30d)
        })

    # Chart 6: Stockout Risk Distribution
    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for lp in latest_preds:
        if lp.stockout_risk in risk_counts:
            risk_counts[lp.stockout_risk] += 1
    chart6_data = [{"risk": k, "count": v} for k, v in risk_counts.items()]

    # Chart 7: Reorder Recommendations Breakdown
    rec_counts = {"REORDER NOW": 0, "REORDER SOON": 0, "MONITOR": 0, "NO ACTION": 0}
    for lp in latest_preds:
        if lp.recommendation in rec_counts:
            rec_counts[lp.recommendation] += 1
    chart7_data = [{"recommendation": k, "count": v} for k, v in rec_counts.items()]

    # Query persistent AI Reorder Recommendations
    pending_recs = db.query(ReorderRecommendation).filter(
        ReorderRecommendation.status == "PENDING_APPROVAL"
    ).order_by(desc(ReorderRecommendation.created_at)).all()

    approved_recs_count = db.query(ReorderRecommendation).filter(
        ReorderRecommendation.status.in_(["APPROVED", "PO_CREATED"])
    ).count()

    pending_pos_count = db.query(PurchaseOrder).filter(
        PurchaseOrder.status.in_(["DRAFT", "ORDERED", "APPROVED"])
    ).count()

    orders_received_count = db.query(PurchaseOrder).filter(
        PurchaseOrder.status == "RECEIVED"
    ).count()

    ai_reorder_alerts = [
        {
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product.name if r.product else f"Product {r.product_id}",
            "sku": r.product.sku if r.product else "",
            "current_stock": r.current_stock,
            "reorder_point": r.reorder_point,
            "predicted_demand": r.predicted_demand,
            "recommended_quantity": r.recommended_quantity,
            "suggested_quantity": r.recommended_quantity,
            "supplier_id": r.supplier_id,
            "supplier_name": r.supplier.name if r.supplier else "ABC Electronics",
            "estimated_cost": r.estimated_cost,
            "urgency": r.urgency,
            "ai_decision": r.ai_decision,
            "status": "Pending Approval",
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else ""
        }
        for r in pending_recs
    ]

    return {
        "total_skus": total_skus,
        "total_stock_value": round(stock_value, 2),
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "open_purchase_orders_count": open_po_count,
        "open_purchase_orders_value": round(open_po_value, 2),
        "transactions_30d_count": tx_30d,
        "predicted_30d_demand_total": round(total_predicted_demand, 1),
        "high_stockout_risk_count": high_risk_count,
        "pending_reorders_count": pending_reorders_count,
        "pending_ai_recommendations": len(pending_recs),
        "approved_reorders": approved_recs_count,
        "pending_purchase_orders": pending_pos_count,
        "orders_received": orders_received_count,
        "low_stock_items": low_stock_count,
        "out_of_stock_items": out_of_stock_count,
        "ai_reorder_alerts": ai_reorder_alerts,
        "recent_alerts": recent_alerts,
        "recent_transactions": recent_transactions,
        "charts": {
            "daily_volume": chart1_data,
            "sales_trend": chart2_data,
            "category_distribution": chart3_data,
            "location_distribution": chart4_data,
            "predicted_vs_actual": chart5_data,
            "risk_distribution": chart6_data,
            "reorder_breakdown": chart7_data
        }
    }

def generate_ai_reorder_plan(
    db: Session,
    budget: Optional[float] = None,
    priority_note: Optional[str] = None,
    product_ids: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Generates structured AI Reorder Plan meeting all requirements:
    1. Executive Summary
    2. Recommended Actions grouped by CRITICAL, HIGH, MEDIUM
    3. Supplier Consolidation
    4. Risk Callouts
    5. Budget Summary with trade-offs
    """
    query = db.query(Product)
    if product_ids:
        query = query.filter(Product.id.in_(product_ids))
    products = query.all()

    items_detail = []
    actions_grouped = {"CRITICAL": [], "HIGH": [], "MEDIUM": [], "LOW": []}
    supplier_groups: Dict[int, List[Dict[str, Any]]] = {}

    for p in products:
        curr_stock = get_product_stock_total(db, p.id)
        latest_pred = db.query(Prediction).filter(Prediction.product_id == p.id).order_by(desc(Prediction.created_at)).first()

        # Find open PO quantity
        open_pos = db.query(PurchaseOrderItem).join(PurchaseOrder).filter(
            PurchaseOrderItem.product_id == p.id,
            PurchaseOrder.status.in_(["ORDERED", "PARTIALLY_RECEIVED", "DRAFT"])
        ).all()
        open_po_qty = sum(item.quantity_ordered - item.quantity_received for item in open_pos)

        pred_demand = latest_pred.predicted_demand if latest_pred else 30.0
        st_demand = latest_pred.short_term_demand if latest_pred else 8.0
        risk = latest_pred.stockout_risk if latest_pred else "LOW"
        inv_status = latest_pred.inventory_status if latest_pred else "NORMAL"
        rec_qty = latest_pred.recommended_reorder_quantity if latest_pred else p.reorder_quantity

        # Determine Urgency Tier
        if curr_stock <= 0 or curr_stock <= p.safety_stock * 0.5:
            urgency = "CRITICAL"
        elif curr_stock <= p.reorder_point or risk == "HIGH":
            urgency = "HIGH"
        elif risk == "MEDIUM" or curr_stock <= p.reorder_point * 1.25:
            urgency = "MEDIUM"
        else:
            urgency = "LOW"

        # Only include in reorder plan if reordering is warranted
        if urgency in ["CRITICAL", "HIGH", "MEDIUM"] or (product_ids and len(product_ids) > 0):
            recommended_qty = max(rec_qty, p.reorder_quantity) if rec_qty > 0 else p.reorder_quantity
            # Deduct pipeline quantity
            recommended_qty = max(0, recommended_qty - open_po_qty)
            est_cost = round(recommended_qty * p.unit_cost, 2)

            item_obj = {
                "product_id": p.id,
                "product_name": p.name,
                "sku": p.sku,
                "current_stock": curr_stock,
                "reorder_point": p.reorder_point,
                "predicted_demand": round(pred_demand, 1),
                "short_term_demand": round(st_demand, 1),
                "open_po_quantity": open_po_qty,
                "recommended_quantity": recommended_qty,
                "unit_cost": p.unit_cost,
                "estimated_cost": est_cost,
                "supplier_id": p.supplier_id,
                "supplier_name": p.supplier.name if p.supplier else "Unknown",
                "lead_time_days": p.lead_time_days,
                "stockout_risk": risk,
                "inventory_status": inv_status,
                "urgency": urgency
            }

            items_detail.append(item_obj)
            actions_grouped[urgency].append(item_obj)

            if p.supplier_id not in supplier_groups:
                supplier_groups[p.supplier_id] = []
            supplier_groups[p.supplier_id].append(item_obj)

    # Calculate Totals
    critical_count = len(actions_grouped["CRITICAL"])
    high_count = len(actions_grouped["HIGH"])
    medium_count = len(actions_grouped["MEDIUM"])
    total_reorder_units = sum(i["recommended_quantity"] for i in items_detail)
    total_estimated_cost = sum(i["estimated_cost"] for i in items_detail)

    # Executive Summary
    urgency_level = "EMERGENCY" if critical_count > 0 else ("HIGH" if high_count > 0 else "MODERATE")
    exec_summary = {
        "inventory_situation": f"Analysis evaluated {len(products)} SKUs. Identified {critical_count} critical shortage items and {high_count} high-risk items requiring procurement.",
        "critical_products_count": critical_count,
        "high_risk_products_count": high_count,
        "medium_priority_count": medium_count,
        "total_items_to_reorder": len(items_detail),
        "total_units_recommended": total_reorder_units,
        "overall_urgency": urgency_level,
        "priority_note": priority_note or "Automated multi-agent replenishment schedule."
    }

    # Supplier Consolidation
    consolidation_list = []
    for s_id, s_items in supplier_groups.items():
        sup = db.query(Supplier).filter(Supplier.id == s_id).first()
        s_cost = sum(it["estimated_cost"] for it in s_items)
        s_qty = sum(it["recommended_quantity"] for it in s_items)
        consolidation_list.append({
            "supplier_id": s_id,
            "supplier_name": sup.name if sup else f"Supplier {s_id}",
            "lead_time_days": sup.lead_time_days if sup else 7,
            "item_count": len(s_items),
            "total_quantity": s_qty,
            "total_cost": round(s_cost, 2),
            "items": s_items
        })
    consolidation_list.sort(key=lambda x: x["total_cost"], reverse=True)

    # Risk Callouts
    risk_callouts = []
    for it in actions_grouped["CRITICAL"]:
        risk_callouts.append(f"Immediate Stockout Alert: '{it['product_name']}' has only {it['current_stock']} units on hand with lead time of {it['lead_time_days']} days.")
    for it in actions_grouped["HIGH"]:
        if it["lead_time_days"] >= 7:
            risk_callouts.append(f"Long Lead Time Warning: '{it['product_name']}' requires {it['lead_time_days']} days lead time from {it['supplier_name']}.")

    if not risk_callouts:
        risk_callouts.append("All operational safety buffers are currently above critical thresholds.")

    # Budget Summary & Trade-offs
    budget_summary = {
        "estimated_total_cost": round(total_estimated_cost, 2),
        "allocated_budget": round(budget, 2) if budget is not None else None,
        "difference": round(budget - total_estimated_cost, 2) if budget is not None else 0.0,
        "is_within_budget": (budget is None) or (total_estimated_cost <= budget),
        "trade_offs": ""
    }

    if budget is not None:
        if total_estimated_cost > budget:
            deficit = total_estimated_cost - budget
            budget_summary["trade_offs"] = (
                f"Budget exceeded by Rs. {deficit:,.2f}. Recommendation: Prioritize all {critical_count} CRITICAL "
                f"items first (Rs. {sum(i['estimated_cost'] for i in actions_grouped['CRITICAL']):,.2f}), then allocate remaining funds to HIGH priority items."
            )
        else:
            surplus = budget - total_estimated_cost
            budget_summary["trade_offs"] = f"Plan is within budget with Rs. {surplus:,.2f} surplus available for buffer safety stock."
    else:
        budget_summary["trade_offs"] = "Standard plan unconstrained by fixed financial budget ceiling."

    return {
        "executive_summary": exec_summary,
        "recommended_actions": actions_grouped,
        "supplier_consolidation": consolidation_list,
        "risk_callouts": risk_callouts,
        "budget_summary": budget_summary,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }

def convert_plan_to_draft_pos(db: Session, plan: Dict[str, Any]) -> List[PurchaseOrder]:
    """Creates actual Draft Purchase Orders in the database grouped by supplier from the AI plan."""
    created_pos = []
    consolidation = plan.get("supplier_consolidation", [])

    for group in consolidation:
        s_id = group["supplier_id"]
        items = group["items"]
        if not items or group["total_quantity"] <= 0:
            continue

        po_num = f"PO-{int(datetime.utcnow().timestamp()) % 1000000:06d}"
        sup = db.query(Supplier).filter(Supplier.id == s_id).first()
        lead_days = sup.lead_time_days if sup else 7
        expected_date = datetime.utcnow() + timedelta(days=lead_days)

        po = PurchaseOrder(
            po_number=po_num,
            supplier_id=s_id,
            status="DRAFT",
            order_date=datetime.utcnow(),
            expected_delivery_date=expected_date,
            total_amount=group["total_cost"],
            notes=f"Auto-generated draft PO from AI Reorder Plan for {len(items)} items."
        )
        db.add(po)
        db.commit()
        db.refresh(po)

        for item in items:
            if item["recommended_quantity"] > 0:
                po_item = PurchaseOrderItem(
                    purchase_order_id=po.id,
                    product_id=item["product_id"],
                    quantity_ordered=item["recommended_quantity"],
                    quantity_received=0,
                    unit_cost=item["unit_cost"]
                )
                db.add(po_item)
        db.commit()
        created_pos.append(po)

    return created_pos

def get_reorder_recommendations_list(
    db: Session,
    status: Optional[str] = None,
    urgency: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Returns persistent AI reorder recommendations, filtered by status and urgency."""
    query = db.query(ReorderRecommendation)
    if status and status.upper() != "ALL":
        query = query.filter(ReorderRecommendation.status == status.upper())
    if urgency and urgency.upper() != "ALL":
        query = query.filter(ReorderRecommendation.urgency == urgency.upper())

    recs = query.order_by(desc(ReorderRecommendation.created_at)).all()
    results = []
    for r in recs:
        results.append({
            "id": r.id,
            "product_id": r.product_id,
            "product_name": r.product.name if r.product else f"Product {r.product_id}",
            "sku": r.product.sku if r.product else "",
            "supplier_id": r.supplier_id,
            "supplier_name": r.supplier.name if r.supplier else "ABC Electronics",
            "current_stock": r.current_stock,
            "reorder_point": r.reorder_point,
            "predicted_demand": r.predicted_demand,
            "recommended_quantity": r.recommended_quantity,
            "estimated_cost": r.estimated_cost,
            "unit_cost": r.product.unit_cost if r.product else 0.0,
            "urgency": r.urgency,
            "ai_decision": r.ai_decision,
            "status": r.status,
            "created_at": r.created_at,
            "approved_at": r.approved_at
        })
    return results

def get_reorder_recommendation_detail(db: Session, rec_id: int) -> Optional[Dict[str, Any]]:
    r = db.query(ReorderRecommendation).filter(ReorderRecommendation.id == rec_id).first()
    if not r:
        return None
    return {
        "id": r.id,
        "product_id": r.product_id,
        "product_name": r.product.name if r.product else f"Product {r.product_id}",
        "sku": r.product.sku if r.product else "",
        "supplier_id": r.supplier_id,
        "supplier_name": r.supplier.name if r.supplier else "ABC Electronics",
        "current_stock": r.current_stock,
        "reorder_point": r.reorder_point,
        "predicted_demand": r.predicted_demand,
        "recommended_quantity": r.recommended_quantity,
        "estimated_cost": r.estimated_cost,
        "unit_cost": r.product.unit_cost if r.product else 0.0,
        "lead_time_days": r.product.lead_time_days if r.product else 7,
        "safety_stock": r.product.safety_stock if r.product else 10,
        "urgency": r.urgency,
        "ai_decision": r.ai_decision,
        "status": r.status,
        "created_at": r.created_at,
        "approved_at": r.approved_at
    }

def approve_reorder_recommendation(
    db: Session,
    rec_id: int,
    quantity: Optional[int] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Approves AI recommendation:
    1. Sets status to APPROVED
    2. Creates a DRAFT Purchase Order
    3. IMPORTANT: Inventory remains completely UNCHANGED (Stock does not increase).
    """
    rec = db.query(ReorderRecommendation).filter(ReorderRecommendation.id == rec_id).first()
    if not rec:
        raise ValueError("Reorder recommendation not found.")

    stock_current = get_product_stock_total(db, rec.product_id)

    if rec.status == "APPROVED" or rec.status == "PO_CREATED":
        # Find the existing Draft PO created for this product if already approved
        existing_item = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.product_id == rec.product_id
        ).order_by(desc(PurchaseOrderItem.id)).first()
        existing_po = db.query(PurchaseOrder).filter(
            PurchaseOrder.id == existing_item.purchase_order_id
        ).first() if existing_item else None

        po_num = existing_po.po_number if existing_po else "PO-EXISTING"
        po_id = existing_po.id if existing_po else 0
        po_status = existing_po.status if existing_po else "DRAFT"

        return {
            "status": "SUCCESS",
            "recommendation_id": rec.id,
            "recommendation_status": "APPROVED",
            "po_id": po_id,
            "po_number": po_num,
            "po_status": po_status,
            "current_stock": stock_current,
            "product_name": rec.product.name if rec.product else f"Product {rec.product_id}",
            "message": f"Recommendation was already approved. Draft Purchase Order {po_num} is ready with status {po_status}. Inventory remains unchanged at {stock_current}."
        }

    rec.status = "APPROVED"
    rec.approved_at = datetime.utcnow()

    # Determine approved order quantity (custom override or AI recommended)
    final_qty = quantity if (quantity and quantity > 0) else rec.recommended_quantity
    rec.recommended_quantity = final_qty

    unit_cost = rec.product.unit_cost if rec.product else round(rec.estimated_cost / max(final_qty, 1), 2)
    total_cost = round(final_qty * unit_cost, 2)
    rec.estimated_cost = total_cost

    # Generate sequential PO Number (e.g. PO-1001)
    po_count = db.query(PurchaseOrder).count()
    po_num = f"PO-{1000 + po_count + 1}"
    existing_po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_num).first()
    if existing_po:
        po_num = f"PO-{int(datetime.utcnow().timestamp()) % 1000000:06d}"

    sup = db.query(Supplier).filter(Supplier.id == rec.supplier_id).first()
    lead_days = sup.lead_time_days if sup else 7
    expected_delivery = datetime.utcnow() + timedelta(days=lead_days)

    default_notes = f"Draft Purchase Order created after manager approval of AI recommendation #{rec.id} for {rec.product.name if rec.product else ''}."
    final_notes = f"{notes} ({default_notes})" if notes else default_notes

    draft_po = PurchaseOrder(
        po_number=po_num,
        supplier_id=rec.supplier_id,
        status="DRAFT",
        total_amount=total_cost,
        order_date=datetime.utcnow(),
        created_at=datetime.utcnow(),
        approved_at=datetime.utcnow(),
        expected_delivery_date=expected_delivery,
        notes=final_notes
    )
    db.add(draft_po)
    db.commit()
    db.refresh(draft_po)

    po_item = PurchaseOrderItem(
        purchase_order_id=draft_po.id,
        product_id=rec.product_id,
        quantity_ordered=final_qty,
        quantity_received=0,
        unit_cost=unit_cost
    )
    db.add(po_item)
    db.commit()

    # Current stock check: verify stock is UNCHANGED
    stock_current = get_product_stock_total(db, rec.product_id)

    return {
        "status": "SUCCESS",
        "recommendation_id": rec.id,
        "recommendation_status": "APPROVED",
        "po_id": draft_po.id,
        "po_number": draft_po.po_number,
        "po_status": draft_po.status,
        "current_stock": stock_current,
        "product_name": rec.product.name if rec.product else f"Product {rec.product_id}",
        "message": f"Recommendation approved. Draft Purchase Order {draft_po.po_number} created with status DRAFT. Inventory remains unchanged at {stock_current}."
    }

def reject_reorder_recommendation(db: Session, rec_id: int) -> Dict[str, Any]:
    """Rejects AI recommendation. Inventory remains completely UNCHANGED."""
    rec = db.query(ReorderRecommendation).filter(ReorderRecommendation.id == rec_id).first()
    if not rec:
        raise ValueError("Reorder recommendation not found.")

    rec.status = "REJECTED"
    db.commit()
    db.refresh(rec)

    stock_current = get_product_stock_total(db, rec.product_id)
    return {
        "status": "SUCCESS",
        "recommendation_id": rec.id,
        "recommendation_status": "REJECTED",
        "current_stock": stock_current,
        "message": f"Recommendation #{rec.id} for '{rec.product.name if rec.product else ''}' rejected. Inventory remains unchanged at {stock_current}."
    }

def receive_purchase_order_delivery(
    db: Session,
    po_id: int,
    received_quantity: int,
    item_id: Optional[int] = None,
    location_id: int = 1,
    reference_number: str = "INV-1001",
    note: Optional[str] = None
) -> Dict[str, Any]:
    """
    Manually records supplier delivery receipt.
    Only AFTER this action does inventory increase!
    Records a RECEIVE transaction with previous_stock and new_stock.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise ValueError("Purchase Order not found.")

    if not po.items:
        raise ValueError("Purchase Order contains no line items to receive.")

    if item_id:
        po_item = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.id == item_id,
            PurchaseOrderItem.purchase_order_id == po_id
        ).first()
    else:
        # Pick the first item with unfulfilled quantity
        po_item = next((it for it in po.items if it.quantity_received < it.quantity_ordered), po.items[0])

    if not po_item:
        raise ValueError("Valid Purchase Order line item not found.")

    po_item.quantity_received += received_quantity

    # Determine PO status
    all_completed = all(it.quantity_received >= it.quantity_ordered for it in po.items)
    any_received = any(it.quantity_received > 0 for it in po.items)

    if all_completed:
        po.status = "RECEIVED"
    elif any_received:
        po.status = "PARTIALLY_RECEIVED"

    po.received_at = datetime.utcnow()
    db.commit()

    # Step: Execute stock receipt via InventoryAgent
    agent_sys = MultiAgentSystem(db)
    ref_str = reference_number or f"INV-{po.po_number}"
    reason_str = f"Supplier Delivery for {po.po_number} from {po.supplier.name if po.supplier else 'Supplier'}"

    result = agent_sys.process_and_evaluate(
        product_id=po_item.product_id,
        transaction_type="RECEIVE",
        quantity=received_quantity,
        destination_location=location_id or 1,
        reason=reason_str,
        reference_number=ref_str,
        note=note or f"Supplier delivery receipt confirmed by warehouse manager for PO {po.po_number}."
    )

    return {
        "status": "SUCCESS",
        "po_id": po.id,
        "po_number": po.po_number,
        "po_status": po.status,
        "product_id": po_item.product_id,
        "product_name": result["product_name"],
        "received_quantity": received_quantity,
        "previous_stock": result["previous_stock"],
        "new_stock": result["current_stock"],
        "reference_number": ref_str,
        "transaction_id": result["transaction"].transaction_id if result.get("transaction") else None,
        "recommendation": result["decision"]["recommendation"],
        "message": f"Stock received: {result['product_name']} {result['previous_stock']} -> {result['current_stock']}. Purchase Order {po.po_number} status: {po.status}."
    }
