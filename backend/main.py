"""
backend/main.py
FastAPI Application Entry Point for AI Warehouse Inventory Management System.
Exposes REST endpoints and WebSocket stream for real-time multi-agent operations.
"""

import os
import sys
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from fastapi import FastAPI, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

# Ensure project root is in sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.database import engine, Base, get_db
from backend.models import (
    Product, Category, Supplier, Location, Inventory,
    Transaction, PurchaseOrder, PurchaseOrderItem,
    StockCount, StockCountItem, Prediction, Alert,
    ReorderRecommendation
)
from backend.schemas import (
    ProductCreate, ProductOut, CategoryOut, CategoryBase,
    SupplierOut, SupplierCreate, LocationOut, LocationCreate,
    InventoryOut, TransactionOut, TransactionCreate,
    PurchaseOrderCreate, PurchaseOrderOut, POReceiveItemRequest,
    POReceiveStockRequest,
    StockReceiveRequest, StockIssueRequest, StockAdjustRequest,
    StockTransferRequest, StockReturnRequest,
    StockCountCreate, StockCountOut,
    PredictionOut, AlertOut,
    ReorderRecommendationOut, ReorderRecommendationApprovalResponse,
    ReorderRecommendationRejectResponse,
    AIReorderPlanRequest, AIReorderPlanResponse,
    SimulationStatusResponse, SimulationSpeedRequest,
    AgentsStatusResponse, DashboardStats,
    AIExplainReorderRequest, AIExplainReorderResponse,
    AIChatRequest, AIChatResponse,
    AIDailySummaryResponse,
    AIReportRequest, AIReportResponse,
    AIStatusResponse
)
from backend.agents import MultiAgentSystem, agent_tracker
from backend.services import (
    seed_database_from_csv, get_dashboard_data,
    get_all_products_enriched, generate_ai_reorder_plan,
    convert_plan_to_draft_pos, get_product_stock_total,
    get_reorder_recommendations_list, get_reorder_recommendation_detail,
    approve_reorder_recommendation, reject_reorder_recommendation,
    receive_purchase_order_delivery
)
from backend.simulator import simulator
from backend.websocket_manager import ws_manager
from backend.genai_service import gemini_service
from ml.predict import prediction_service

# Configure clean, structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("warehouse_api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema, seeds CSV catalogs, and verifies ML models."""
    logger.info("Initializing Warehouse Inventory System database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize DB session for startup seeding
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        seed_database_from_csv(db)
    except Exception as e:
        logger.error(f"Error during database seed: {e}", exc_info=True)
    finally:
        db.close()

    # Load ML models into centralized prediction service
    prediction_service.load_models()
    
    # Register active ASGI event loop in simulator
    import asyncio
    simulator.set_loop(asyncio.get_running_loop())

    logger.info("System startup routine completed. Backend is operational.")
    yield
    # Shutdown routine
    simulator.stop()
    logger.info("Simulator halted. Server shutdown.")

app = FastAPI(
    title="Multi-Agent Warehouse Inventory Management & Reorder Prediction API",
    description="Production-grade AI backend combining 5 collaborative agents, real-time transaction replay simulator, and predictive inventory analytics.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# ROOT & DASHBOARD
# -------------------------------------------------------------
@app.get("/")
def get_root():
    return {
        "system": "Multi-Agent System for Automated Warehouse Inventory Management and Reorder Prediction",
        "status": "ONLINE",
        "timestamp": datetime.utcnow().isoformat(),
        "documentation": "/docs",
        "websocket": "/ws",
        "data_notice": "The system uses synthetically generated warehouse transaction data for model training and a transaction simulator to demonstrate real-time inventory processing."
    }

@app.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    """Returns real-time aggregated metrics and chart datasets for the live dashboard."""
    return get_dashboard_data(db)

# -------------------------------------------------------------
# PRODUCTS CATALOG
# -------------------------------------------------------------
@app.get("/products", response_model=List[ProductOut])
def get_products(
    category_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    stock_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    enriched = get_all_products_enriched(db)
    filtered = enriched

    if category_id:
        filtered = [p for p in filtered if p["category_id"] == category_id]
    if supplier_id:
        filtered = [p for p in filtered if p["supplier_id"] == supplier_id]
    if stock_status:
        filtered = [p for p in filtered if p["stock_status"] == stock_status.upper()]
    if search:
        s = search.lower()
        filtered = [p for p in filtered if s in p["name"].lower() or s in p["sku"].lower() or s in p["barcode"].lower()]

    return filtered

@app.get("/products/{id}", response_model=Dict[str, Any])
def get_product_detail(id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    stock = get_product_stock_total(db, product.id)
    inv_by_loc = []
    for inv in product.inventory:
        inv_by_loc.append({
            "location_id": inv.location_id,
            "location_name": inv.location.name if inv.location else f"Loc {inv.location_id}",
            "location_code": inv.location.code if inv.location else f"LOC-{inv.location_id}",
            "quantity": inv.quantity
        })

    # Recent transactions for this product
    tx_history = db.query(Transaction).filter(Transaction.product_id == id).order_by(desc(Transaction.timestamp)).limit(20).all()
    tx_list = [
        {
            "id": t.id,
            "transaction_id": t.transaction_id,
            "transaction_type": t.transaction_type,
            "quantity": t.quantity,
            "source_location_name": t.src_loc.name if t.src_loc else None,
            "destination_location_name": t.dest_loc.name if t.dest_loc else None,
            "reason": t.reason,
            "reference_number": t.reference_number,
            "note": t.note,
            "timestamp": t.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }
        for t in tx_history
    ]

    # Purchase order history for this product
    po_items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.product_id == id).order_by(desc(PurchaseOrderItem.id)).limit(10).all()
    po_list = [
        {
            "po_number": item.purchase_order.po_number,
            "status": item.purchase_order.status,
            "order_date": item.purchase_order.order_date.strftime("%Y-%m-%d"),
            "quantity_ordered": item.quantity_ordered,
            "quantity_received": item.quantity_received,
            "unit_cost": item.unit_cost
        }
        for item in po_items if item.purchase_order
    ]

    # Latest AI predictions
    latest_pred = db.query(Prediction).filter(Prediction.product_id == id).order_by(desc(Prediction.created_at)).first()

    status = "IN STOCK"
    if stock == 0:
        status = "OUT OF STOCK"
    elif stock <= product.reorder_point:
        status = "LOW STOCK"

    margin = round(((product.selling_price - product.unit_cost) / product.selling_price) * 100, 1) if product.selling_price > 0 else 0.0

    return {
        "id": product.id,
        "sku": product.sku,
        "barcode": product.barcode,
        "name": product.name,
        "category_id": product.category_id,
        "category_name": product.category.name if product.category else "",
        "supplier_id": product.supplier_id,
        "supplier_name": product.supplier.name if product.supplier else "",
        "unit": product.unit,
        "unit_cost": product.unit_cost,
        "selling_price": product.selling_price,
        "margin": margin,
        "reorder_point": product.reorder_point,
        "reorder_quantity": product.reorder_quantity,
        "lead_time_days": product.lead_time_days,
        "safety_stock": product.safety_stock,
        "current_stock": stock,
        "stock_status": status,
        "stock_by_location": inv_by_loc,
        "transaction_history": tx_list,
        "purchase_order_history": po_list,
        "latest_prediction": {
            "predicted_demand": latest_pred.predicted_demand,
            "short_term_demand": latest_pred.short_term_demand,
            "stockout_risk": latest_pred.stockout_risk,
            "inventory_status": latest_pred.inventory_status,
            "recommended_reorder_quantity": latest_pred.recommended_reorder_quantity,
            "recommendation": latest_pred.recommendation,
            "created_at": latest_pred.created_at.strftime("%Y-%m-%d %H:%M:%S")
        } if latest_pred else None
    }

@app.post("/products", response_model=ProductOut)
def create_product(prod_in: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter((Product.sku == prod_in.sku) | (Product.barcode == prod_in.barcode)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU or barcode already exists.")

    p = Product(**prod_in.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)

    # Initialize zero stock across locations
    locations = db.query(Location).all()
    for loc in locations:
        db.add(Inventory(product_id=p.id, location_id=loc.id, quantity=0))
    db.commit()

    # Initial AI evaluation
    MultiAgentSystem(db).process_and_evaluate(product_id=p.id)

    return ProductOut(
        id=p.id,
        sku=p.sku,
        barcode=p.barcode,
        name=p.name,
        category_id=p.category_id,
        category_name=p.category.name if p.category else "",
        supplier_id=p.supplier_id,
        supplier_name=p.supplier.name if p.supplier else "",
        unit=p.unit,
        unit_cost=p.unit_cost,
        selling_price=p.selling_price,
        reorder_point=p.reorder_point,
        reorder_quantity=p.reorder_quantity,
        lead_time_days=p.lead_time_days,
        safety_stock=p.safety_stock,
        current_stock=0,
        margin=round(((p.selling_price - p.unit_cost) / p.selling_price) * 100, 1),
        stock_status="OUT OF STOCK"
    )

# -------------------------------------------------------------
# INVENTORY
# -------------------------------------------------------------
@app.get("/inventory", response_model=List[InventoryOut])
def get_inventory(location_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Inventory).join(Product).join(Location)
    if location_id:
        query = query.filter(Inventory.location_id == location_id)
    records = query.all()
    return [
        InventoryOut(
            id=r.id,
            product_id=r.product_id,
            product_name=r.product.name,
            sku=r.product.sku,
            location_id=r.location_id,
            location_name=r.location.name,
            location_code=r.location.code,
            quantity=r.quantity,
            updated_at=r.updated_at
        )
        for r in records
    ]

@app.get("/inventory/{product_id}", response_model=List[InventoryOut])
def get_inventory_for_product(product_id: int, db: Session = Depends(get_db)):
    records = db.query(Inventory).filter(Inventory.product_id == product_id).all()
    return [
        InventoryOut(
            id=r.id,
            product_id=r.product_id,
            product_name=r.product.name,
            sku=r.product.sku,
            location_id=r.location_id,
            location_name=r.location.name,
            location_code=r.location.code,
            quantity=r.quantity,
            updated_at=r.updated_at
        )
        for r in records
    ]

# -------------------------------------------------------------
# TRANSACTIONS & STOCK OPERATIONS
# -------------------------------------------------------------
@app.get("/transactions", response_model=List[TransactionOut])
def get_transactions(
    product_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    location_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).order_by(desc(Transaction.timestamp))
    if product_id:
        query = query.filter(Transaction.product_id == product_id)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type.upper())
    if location_id:
        query = query.filter((Transaction.source_location == location_id) | (Transaction.destination_location == location_id))

    records = query.limit(limit).all()
    return [
        TransactionOut(
            id=t.id,
            transaction_id=t.transaction_id,
            product_id=t.product_id,
            product_name=t.product.name if t.product else None,
            sku=t.product.sku if t.product else None,
            source_location=t.source_location,
            source_location_name=t.src_loc.name if t.src_loc else None,
            destination_location=t.destination_location,
            destination_location_name=t.dest_loc.name if t.dest_loc else None,
            transaction_type=t.transaction_type,
            quantity=t.quantity,
            reason=t.reason,
            reference_number=t.reference_number,
            note=t.note,
            timestamp=t.timestamp
        )
        for t in records
    ]

@app.post("/transactions", response_model=Dict[str, Any])
async def create_transaction(req: TransactionCreate, db: Session = Depends(get_db)):
    """Generic transaction processor that runs the 5-agent pipeline."""
    agent_sys = MultiAgentSystem(db)
    try:
        result = agent_sys.process_and_evaluate(
            product_id=req.product_id,
            transaction_type=req.transaction_type.upper(),
            quantity=req.quantity,
            source_location=req.source_location,
            destination_location=req.destination_location,
            reason=req.reason,
            reference_number=req.reference_number,
            note=req.note
        )

        dash_stats = get_dashboard_data(db)
        notification = result["alerts"].get("notification")
        reorder_breached = result["alerts"].get("reorder_breached", False)
        reorder_pt = result["alerts"].get("reorder_point", 0)

        await ws_manager.broadcast({
            "event": "MANUAL_TRANSACTION",
            "data": {
                "transaction_id": result["transaction"].transaction_id,
                "product_id": result["product_id"],
                "product_name": result["product_name"],
                "sku": result.get("sku", ""),
                "transaction_type": req.transaction_type.upper(),
                "quantity": req.quantity,
                "new_stock": result["current_stock"],
                "reorder_point": reorder_pt,
                "reorder_breached": reorder_breached,
                "notification": notification,
                "order_placed": False,
                "stockout_risk": result["alerts"]["stockout_risk"],
                "decision": result["decision"]["recommendation"],
                "dashboard_stats": dash_stats
            }
        })
        return {
            "status": "SUCCESS",
            "transaction_id": result["transaction"].transaction_id,
            "product_id": result["product_id"],
            "product_name": result["product_name"],
            "new_stock": result["current_stock"],
            "reorder_point": reorder_pt,
            "reorder_breached": reorder_breached,
            "notification": notification,
            "order_placed": False,
            "recommendation": result["decision"]["recommendation"],
            "stockout_risk": result["alerts"]["stockout_risk"]
        }
    except Exception as e:
        logger.error(f"Transaction failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/stock/receive")
async def stock_receive(req: StockReceiveRequest, db: Session = Depends(get_db)):
    return await create_transaction(
        TransactionCreate(
            product_id=req.product_id,
            transaction_type="RECEIVE",
            quantity=req.quantity,
            destination_location=req.destination_location,
            reference_number=req.reference_number,
            reason=req.reason,
            note=req.note
        ),
        db
    )

@app.post("/stock/issue")
async def stock_issue(req: StockIssueRequest, db: Session = Depends(get_db)):
    return await create_transaction(
        TransactionCreate(
            product_id=req.product_id,
            transaction_type="ISSUE",
            quantity=req.quantity,
            source_location=req.source_location,
            reference_number=req.reference_number,
            reason=req.reason,
            note=req.note
        ),
        db
    )

@app.post("/stock/adjust")
async def stock_adjust(req: StockAdjustRequest, db: Session = Depends(get_db)):
    return await create_transaction(
        TransactionCreate(
            product_id=req.product_id,
            transaction_type="ADJUST",
            quantity=req.actual_quantity,
            source_location=req.location_id,
            destination_location=req.location_id,
            reason=req.reason,
            note=req.note
        ),
        db
    )

@app.post("/stock/transfer")
async def stock_transfer(req: StockTransferRequest, db: Session = Depends(get_db)):
    return await create_transaction(
        TransactionCreate(
            product_id=req.product_id,
            transaction_type="TRANSFER",
            quantity=req.quantity,
            source_location=req.source_location,
            destination_location=req.destination_location,
            reason=req.reason,
            note=req.note
        ),
        db
    )

@app.post("/stock/return")
async def stock_return(req: StockReturnRequest, db: Session = Depends(get_db)):
    return await create_transaction(
        TransactionCreate(
            product_id=req.product_id,
            transaction_type="RETURN",
            quantity=req.quantity,
            destination_location=req.destination_location,
            reason=req.reason,
            note=req.note
        ),
        db
    )

# -------------------------------------------------------------
# PURCHASE ORDERS
# -------------------------------------------------------------
@app.get("/purchase-orders", response_model=List[PurchaseOrderOut])
def get_purchase_orders(status: Optional[str] = None, supplier_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(PurchaseOrder).order_by(desc(PurchaseOrder.order_date))
    if status:
        query = query.filter(PurchaseOrder.status == status.upper())
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)

    pos = query.all()
    results = []
    for po in pos:
        items_out = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else f"Product {item.product_id}",
                "sku": item.product.sku if item.product else "",
                "quantity_ordered": item.quantity_ordered,
                "quantity_received": item.quantity_received,
                "unit_cost": item.unit_cost
            }
            for item in po.items
        ]
        results.append(PurchaseOrderOut(
            id=po.id,
            po_number=po.po_number,
            supplier_id=po.supplier_id,
            supplier_name=po.supplier.name if po.supplier else "",
            status=po.status,
            order_date=po.order_date,
            expected_delivery_date=po.expected_delivery_date,
            total_amount=po.total_amount,
            notes=po.notes,
            items=items_out
        ))
    return results

@app.post("/purchase-orders", response_model=PurchaseOrderOut)
def create_purchase_order(po_in: PurchaseOrderCreate, db: Session = Depends(get_db)):
    sup = db.query(Supplier).filter(Supplier.id == po_in.supplier_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    po_num = f"PO-{int(datetime.utcnow().timestamp()) % 1000000:06d}"
    tot_amt = sum(it.quantity_ordered * it.unit_cost for it in po_in.items)

    po = PurchaseOrder(
        po_number=po_num,
        supplier_id=po_in.supplier_id,
        status="ORDERED",
        order_date=datetime.utcnow(),
        expected_delivery_date=po_in.expected_delivery_date or (datetime.utcnow() + timedelta(days=sup.lead_time_days)),
        total_amount=tot_amt,
        notes=po_in.notes
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    for it in po_in.items:
        item_obj = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=it.product_id,
            quantity_ordered=it.quantity_ordered,
            quantity_received=0,
            unit_cost=it.unit_cost
        )
        db.add(item_obj)
    db.commit()

    return PurchaseOrderOut(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        supplier_name=sup.name,
        status=po.status,
        order_date=po.order_date,
        expected_delivery_date=po.expected_delivery_date,
        total_amount=po.total_amount,
        notes=po.notes,
        items=[
            {
                "id": it.id,
                "product_id": it.product_id,
                "product_name": it.product.name if it.product else "",
                "sku": it.product.sku if it.product else "",
                "quantity_ordered": it.quantity_ordered,
                "quantity_received": it.quantity_received,
                "unit_cost": it.unit_cost
            }
            for it in po.items
        ]
    )

@app.get("/purchase-orders/{id}", response_model=PurchaseOrderOut)
def get_single_purchase_order(id: int, db: Session = Depends(get_db)):
    """Fetches full details for a specific purchase order."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")
    items_out = [
        {
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.name if item.product else f"Product {item.product_id}",
            "sku": item.product.sku if item.product else "",
            "quantity_ordered": item.quantity_ordered,
            "quantity_received": item.quantity_received,
            "unit_cost": item.unit_cost
        }
        for item in po.items
    ]
    return PurchaseOrderOut(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        supplier_name=po.supplier.name if po.supplier else "",
        status=po.status,
        order_date=po.order_date,
        created_at=po.created_at,
        approved_at=po.approved_at,
        received_at=po.received_at,
        expected_delivery_date=po.expected_delivery_date,
        total_amount=po.total_amount,
        notes=po.notes,
        items=items_out
    )

@app.post("/purchase-orders/{id}/receive")
async def receive_purchase_order_item(id: int, req: POReceiveItemRequest, db: Session = Depends(get_db)):
    """
    Manually records supplier delivery receipt for a Purchase Order.
    The system NEVER automatically receives products.
    Only after this manual action does inventory increase and a RECEIVE transaction get recorded.
    """
    qty = req.received_quantity or req.quantity_to_receive or 1
    ref_num = req.reference_number or f"INV-PO{id}"
    try:
        res = receive_purchase_order_delivery(
            db=db,
            po_id=id,
            received_quantity=qty,
            item_id=req.item_id,
            location_id=req.location_id or 1,
            reference_number=ref_num,
            note=req.note
        )

        dash_stats = get_dashboard_data(db)
        await ws_manager.broadcast({
            "event": "PO_RECEIVED",
            "data": {
                "po_number": res["po_number"],
                "product_name": res["product_name"],
                "quantity_received": res["received_quantity"],
                "previous_stock": res["previous_stock"],
                "new_stock": res["new_stock"],
                "po_status": res["po_status"],
                "decision": res["recommendation"],
                "dashboard_stats": dash_stats
            }
        })

        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error receiving PO delivery: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# REORDER QUEUE & AI REORDER PLAN
# -------------------------------------------------------------
@app.get("/reorder-queue")
def get_reorder_queue(
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns AI recommendations from reorder_recommendations table,
    filtered by urgency (CRITICAL, HIGH, MEDIUM, LOW) and status (PENDING_APPROVAL, APPROVED, REJECTED, PO_CREATED).
    """
    recs = get_reorder_recommendations_list(db, status=status, urgency=urgency)

    # If the database has no recommendations yet, run agent audit on products to generate baseline recommendations
    if not recs and not status and not urgency:
        products = db.query(Product).all()
        agent_sys = MultiAgentSystem(db)
        for p in products:
            curr_st = get_product_stock_total(db, p.id)
            if curr_st <= p.reorder_point:
                agent_sys.process_and_evaluate(product_id=p.id)
        recs = get_reorder_recommendations_list(db, status=status, urgency=urgency)

    plan = generate_ai_reorder_plan(db)
    all_queue = []
    for tier in ["CRITICAL", "HIGH", "MEDIUM"]:
        all_queue.extend(plan["recommended_actions"].get(tier, []))

    return {
        "total_queue_items": len(recs) if recs else len(all_queue),
        "total_recommendations": len(recs),
        "pending_count": sum(1 for r in recs if r["status"] == "PENDING_APPROVAL"),
        "approved_count": sum(1 for r in recs if r["status"] in ["APPROVED", "PO_CREATED"]),
        "rejected_count": sum(1 for r in recs if r["status"] == "REJECTED"),
        "executive_summary": plan["executive_summary"],
        "recommendations": recs,
        "queue": recs if recs else all_queue
    }

@app.get("/reorder-queue/{id}")
def get_single_reorder_recommendation(id: int, db: Session = Depends(get_db)):
    rec = get_reorder_recommendation_detail(db, id)
    if not rec:
        raise HTTPException(status_code=404, detail="Reorder recommendation not found.")
    return rec

class ApproveReorderBody(BaseModel):
    quantity: Optional[int] = None
    notes: Optional[str] = None

@app.post("/reorder-queue/{id}/approve")
async def approve_recommendation_endpoint(
    id: int,
    body: Optional[ApproveReorderBody] = None,
    db: Session = Depends(get_db)
):
    """
    Warehouse Manager manually approves an AI recommendation.
    Generates a DRAFT Purchase Order.
    INVENTORY REMAINS UNCHANGED (Stock does not increase).
    """
    try:
        qty = body.quantity if body else None
        notes = body.notes if body else None
        res = approve_reorder_recommendation(db, id, quantity=qty, notes=notes)
        dash_stats = get_dashboard_data(db)
        await ws_manager.broadcast({
            "event": "RECOMMENDATION_APPROVED",
            "data": {
                "recommendation_id": id,
                "status": "APPROVED",
                "po_id": res.get("po_id"),
                "po_number": res["po_number"],
                "po_status": res.get("po_status", "DRAFT"),
                "inventory_change": "No change",
                "current_stock": res["current_stock"],
                "product_name": res.get("product_name", ""),
                "message": res.get("message"),
                "dashboard_stats": dash_stats
            }
        })
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error approving recommendation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reorder-queue/{id}/reject")
async def reject_recommendation_endpoint(id: int, db: Session = Depends(get_db)):
    """
    Warehouse Manager rejects an AI recommendation.
    INVENTORY REMAINS UNCHANGED.
    """
    try:
        res = reject_reorder_recommendation(db, id)
        dash_stats = get_dashboard_data(db)
        await ws_manager.broadcast({
            "event": "RECOMMENDATION_REJECTED",
            "data": {
                "recommendation_id": id,
                "status": "REJECTED",
                "inventory_change": "No change",
                "current_stock": res["current_stock"],
                "dashboard_stats": dash_stats
            }
        })
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error rejecting recommendation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/reorder-plan", response_model=AIReorderPlanResponse)
def get_ai_reorder_plan(req: AIReorderPlanRequest, db: Session = Depends(get_db)):
    """Generates complete AI Reorder Plan with executive summary, grouped actions, supplier consolidation, risk callouts, and budget trade-offs."""
    plan = generate_ai_reorder_plan(
        db,
        budget=req.budget,
        priority_note=req.priority_note,
        product_ids=req.product_ids
    )
    return plan

@app.post("/ai/reorder-plan/create-pos")
async def create_draft_pos_from_plan(req: AIReorderPlanRequest, db: Session = Depends(get_db)):
    """Converts the AI Reorder Plan into persisted Draft Purchase Orders grouped by supplier."""
    plan = generate_ai_reorder_plan(db, budget=req.budget, priority_note=req.priority_note, product_ids=req.product_ids)
    created_pos = convert_plan_to_draft_pos(db, plan)

    dash_stats = get_dashboard_data(db)
    await ws_manager.broadcast({
        "event": "DRAFT_POS_CREATED",
        "data": {
            "po_count": len(created_pos),
            "po_numbers": [po.po_number for po in created_pos],
            "dashboard_stats": dash_stats
        }
    })

    return {
        "status": "SUCCESS",
        "created_pos_count": len(created_pos),
        "created_pos": [
            {
                "id": po.id,
                "po_number": po.po_number,
                "supplier_id": po.supplier_id,
                "total_amount": po.total_amount,
                "items_count": len(po.items)
            }
            for po in created_pos
        ]
    }

@app.post("/ai/reorder-plan/{product_id}", response_model=AIReorderPlanResponse)
def get_single_product_reorder_plan(product_id: int, db: Session = Depends(get_db)):
    """Generates recommendation specifically for a single product."""
    plan = generate_ai_reorder_plan(db, product_ids=[product_id])
    return plan

# -------------------------------------------------------------
# TRANSACTION SIMULATOR CONTROLS
# -------------------------------------------------------------
@app.post("/simulation/start")
async def start_simulation(start_index: Optional[int] = None):
    simulator.start(start_from_index=start_index)
    return simulator.get_status()

@app.post("/simulation/pause")
async def pause_simulation():
    simulator.pause()
    return simulator.get_status()

@app.post("/simulation/resume")
async def resume_simulation():
    simulator.resume()
    return simulator.get_status()

@app.post("/simulation/stop")
async def stop_simulation():
    simulator.stop()
    return simulator.get_status()

@app.post("/simulation/speed")
async def set_simulation_speed(req: SimulationSpeedRequest):
    simulator.set_speed(req.delay_seconds)
    return simulator.get_status()

@app.get("/simulation/status", response_model=SimulationStatusResponse)
async def get_simulation_status():
    return simulator.get_status()

# -------------------------------------------------------------
# MULTI-AGENT STATUS & PREDICTIONS
# -------------------------------------------------------------
@app.get("/agents/status", response_model=AgentsStatusResponse)
def get_agents_status():
    """Returns the live state, metrics, and latest action performed by each of the 5 agents."""
    return AgentsStatusResponse(**agent_tracker.state)

@app.get("/predictions", response_model=List[PredictionOut])
def get_predictions(product_id: Optional[int] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Prediction).order_by(desc(Prediction.created_at))
    if product_id:
        query = query.filter(Prediction.product_id == product_id)
    records = query.limit(limit).all()
    return [
        PredictionOut(
            id=p.id,
            product_id=p.product_id,
            product_name=p.product.name if p.product else None,
            sku=p.product.sku if p.product else None,
            predicted_demand=p.predicted_demand,
            short_term_demand=p.short_term_demand,
            stockout_risk=p.stockout_risk,
            inventory_status=p.inventory_status,
            recommended_reorder_quantity=p.recommended_reorder_quantity,
            reorder_point=p.reorder_point,
            recommendation=p.recommendation,
            created_at=p.created_at
        )
        for p in records
    ]

@app.get("/alerts", response_model=List[AlertOut])
def get_alerts(severity: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Alert).order_by(desc(Alert.timestamp))
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    records = query.limit(limit).all()
    return [
        AlertOut(
            id=a.id,
            product_id=a.product_id,
            product_name=a.product.name if a.product else None,
            alert_type=a.alert_type,
            severity=a.severity,
            message=a.message,
            timestamp=a.timestamp,
            is_read=a.is_read
        )
        for a in records
    ]

@app.post("/alerts/{id}/read")
def mark_alert_read(id: int, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found.")
    a.is_read = True
    db.commit()
    return {"status": "SUCCESS"}

# -------------------------------------------------------------
# SUPPLIERS, CATEGORIES, LOCATIONS & STOCK COUNTS
# -------------------------------------------------------------
@app.get("/suppliers", response_model=List[SupplierOut])
def get_suppliers(db: Session = Depends(get_db)):
    sups = db.query(Supplier).all()
    results = []
    for s in sups:
        sku_count = db.query(Product).filter(Product.supplier_id == s.id).count()
        open_pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.supplier_id == s.id,
            PurchaseOrder.status.in_(["ORDERED", "PARTIALLY_RECEIVED", "DRAFT"])
        ).all()
        po_count = len(open_pos)
        po_val = sum(po.total_amount for po in open_pos)
        results.append(SupplierOut(
            id=s.id,
            supplier_code=s.supplier_code,
            name=s.name,
            contact_person=s.contact_person,
            email=s.email,
            phone=s.phone,
            address=s.address,
            lead_time_days=s.lead_time_days,
            minimum_order_amount=s.minimum_order_amount,
            reliability_rating=s.reliability_rating,
            active_sku_count=sku_count,
            open_po_count=po_count,
            open_po_value=round(po_val, 2)
        ))
    return results

@app.get("/suppliers/{id}")
def get_supplier_detail(id: int, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    
    products = db.query(Product).filter(Product.supplier_id == id).all()
    pos = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == id).order_by(desc(PurchaseOrder.order_date)).all()
    return {
        "id": s.id,
        "supplier_code": s.supplier_code,
        "name": s.name,
        "contact_person": s.contact_person,
        "email": s.email,
        "phone": s.phone,
        "address": s.address,
        "lead_time_days": s.lead_time_days,
        "minimum_order_amount": s.minimum_order_amount,
        "reliability_rating": s.reliability_rating,
        "products": [
            {
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "unit_cost": p.unit_cost,
                "lead_time_days": p.lead_time_days
            }
            for p in products
        ],
        "purchase_orders": [
            {
                "id": po.id,
                "po_number": po.po_number,
                "status": po.status,
                "order_date": po.order_date.strftime("%Y-%m-%d"),
                "total_amount": po.total_amount
            }
            for po in pos
        ]
    }

@app.post("/suppliers", response_model=SupplierOut)
def create_supplier(s_in: SupplierCreate, db: Session = Depends(get_db)):
    s = Supplier(**s_in.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return SupplierOut(
        id=s.id,
        supplier_code=s.supplier_code,
        name=s.name,
        contact_person=s.contact_person,
        email=s.email,
        phone=s.phone,
        address=s.address,
        lead_time_days=s.lead_time_days,
        minimum_order_amount=s.minimum_order_amount,
        reliability_rating=s.reliability_rating,
        active_sku_count=0,
        open_po_count=0,
        open_po_value=0.0
    )

@app.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@app.post("/categories", response_model=CategoryOut)
def create_category(cat_in: CategoryBase, db: Session = Depends(get_db)):
    c = Category(**cat_in.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@app.get("/locations", response_model=List[LocationOut])
def get_locations(db: Session = Depends(get_db)):
    return db.query(Location).all()

@app.post("/locations", response_model=LocationOut)
def create_location(loc_in: LocationCreate, db: Session = Depends(get_db)):
    loc = Location(**loc_in.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc

# Stock count campaigns
@app.get("/stock-counts", response_model=List[StockCountOut])
def get_stock_counts(db: Session = Depends(get_db)):
    counts = db.query(StockCount).order_by(desc(StockCount.created_at)).all()
    results = []
    for c in counts:
        items_out = [
            StockCountItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "",
                sku=item.product.sku if item.product else "",
                expected_quantity=item.expected_quantity,
                actual_quantity=item.actual_quantity,
                variance=item.variance
            )
            for item in c.items
        ]
        results.append(StockCountOut(
            id=c.id,
            campaign_name=c.campaign_name,
            location_id=c.location_id,
            location_name=c.location.name if c.location else "",
            status=c.status,
            created_at=c.created_at,
            completed_at=c.completed_at,
            items=items_out
        ))
    return results

@app.post("/stock-counts", response_model=StockCountOut)
async def create_stock_count_campaign(req: StockCountCreate, db: Session = Depends(get_db)):
    sc = StockCount(
        campaign_name=req.campaign_name,
        location_id=req.location_id,
        status="COMPLETED",
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)

    agent_sys = MultiAgentSystem(db)

    items_out = []
    for it in req.items:
        inv = db.query(Inventory).filter(
            Inventory.product_id == it.product_id,
            Inventory.location_id == req.location_id
        ).first()
        expected = inv.quantity if inv else 0
        variance = it.actual_quantity - expected

        item_row = StockCountItem(
            stock_count_id=sc.id,
            product_id=it.product_id,
            expected_quantity=expected,
            actual_quantity=it.actual_quantity,
            variance=variance
        )
        db.add(item_row)
        db.commit()
        db.refresh(item_row)

        # If variance exists, execute an ADJUST transaction through the agent system
        if variance != 0:
            agent_sys.process_and_evaluate(
                product_id=it.product_id,
                transaction_type="ADJUST",
                quantity=it.actual_quantity,
                source_location=req.location_id,
                destination_location=req.location_id,
                reason=f"Count Campaign: {req.campaign_name}",
                reference_number=f"CC-{sc.id}",
                note=f"Physical count updated from {expected} to {it.actual_quantity} (Variance: {variance})."
            )

        items_out.append(StockCountItemOut(
            id=item_row.id,
            product_id=item_row.product_id,
            product_name=item_row.product.name if item_row.product else "",
            sku=item_row.product.sku if item_row.product else "",
            expected_quantity=expected,
            actual_quantity=it.actual_quantity,
            variance=variance
        ))

    dash_stats = get_dashboard_data(db)
    await ws_manager.broadcast({
        "event": "STOCK_COUNT_COMPLETED",
        "data": {
            "campaign_name": sc.campaign_name,
            "items_adjusted": len([it for it in req.items if it.actual_quantity != expected]),
            "dashboard_stats": dash_stats
        }
    })

    return StockCountOut(
        id=sc.id,
        campaign_name=sc.campaign_name,
        location_id=sc.location_id,
        location_name=sc.location.name if sc.location else "",
        status=sc.status,
        created_at=sc.created_at,
        completed_at=sc.completed_at,
        items=items_out
    )

# -------------------------------------------------------------
# GENERATIVE AI ENDPOINTS (GOOGLE GEMINI)
# -------------------------------------------------------------

@app.get("/ai/status", response_model=AIStatusResponse)
def get_ai_status():
    """Returns whether Gemini API is active, configured, and which model is selected."""
    return AIStatusResponse(
        configured=gemini_service.is_configured(),
        model=gemini_service.get_model_name(),
        provider="Google Gemini"
    )

@app.post("/ai/explain-reorder", response_model=AIExplainReorderResponse)
async def ai_explain_reorder(req: AIExplainReorderRequest, db: Session = Depends(get_db)):
    """
    FEATURE 1: Reorder Explanation
    Generates a natural-language explanation for an AI reorder recommendation using actual inventory data.
    """
    rec = None
    product = None

    if req.recommendation_id:
        rec = db.query(ReorderRecommendation).filter(ReorderRecommendation.id == req.recommendation_id).first()
        if rec:
            product = rec.product

    if not product and req.product_id:
        product = db.query(Product).filter(Product.id == req.product_id).first()
        if not rec and product:
            rec = db.query(ReorderRecommendation).filter(
                ReorderRecommendation.product_id == product.id
            ).order_by(desc(ReorderRecommendation.created_at)).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product or recommendation not found.")

    current_stock = get_product_stock_total(db, product.id)
    latest_pred = db.query(Prediction).filter(
        Prediction.product_id == product.id
    ).order_by(desc(Prediction.created_at)).first()

    pred_demand = rec.predicted_demand if rec else (latest_pred.predicted_demand if latest_pred else 0)
    stockout_risk = latest_pred.stockout_risk if latest_pred else ("HIGH" if current_stock < product.reorder_point else "LOW")
    inv_status = latest_pred.inventory_status if latest_pred else ("LOW" if current_stock < product.reorder_point else "NORMAL")
    reorder_qty = rec.recommended_quantity if rec else (latest_pred.recommended_reorder_quantity if latest_pred else product.reorder_quantity)
    decision = rec.ai_decision if rec else (latest_pred.recommendation if latest_pred else ("REORDER NOW" if current_stock < product.reorder_point else "MONITOR"))
    urgency = rec.urgency if rec else ("CRITICAL" if current_stock == 0 else ("HIGH" if current_stock < product.safety_stock else "MEDIUM"))

    structured_data = {
        "product": {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "current_stock": current_stock,
            "reorder_point": product.reorder_point,
            "safety_stock": product.safety_stock,
            "lead_time_days": product.lead_time_days,
            "unit_cost": product.unit_cost,
            "supplier_name": product.supplier.name if product.supplier else "Standard Supplier"
        },
        "prediction": {
            "predicted_demand": pred_demand,
            "stockout_risk": stockout_risk,
            "inventory_status": inv_status,
            "recommended_quantity": reorder_qty
        },
        "decision": {
            "status": decision,
            "urgency": urgency,
            "human_approval_required": True
        }
    }

    res = gemini_service.generate_reorder_explanation(structured_data)
    return AIExplainReorderResponse(
        success=res["success"],
        product_id=product.id,
        product_name=product.name,
        explanation=res["text"],
        structured_data=structured_data,
        error=res.get("error")
    )

@app.post("/ai/chat", response_model=AIChatResponse)
async def ai_chat_assistant(req: AIChatRequest, db: Session = Depends(get_db)):
    """
    FEATURE 2: Inventory AI Assistant
    Answers warehouse manager questions using real-time application facts.
    """
    q_lower = req.question.lower().strip()
    
    # 1. Check for specific product names or SKUs mentioned in question
    all_products = db.query(Product).all()
    matched_products = []
    for p in all_products:
        name_words = [w for w in p.name.lower().split() if len(w) > 3]
        if (p.name.lower() in q_lower or 
            p.sku.lower() in q_lower or 
            any(w in q_lower for w in name_words)):
            
            st = get_product_stock_total(db, p.id)
            lp = db.query(Prediction).filter(Prediction.product_id == p.id).order_by(desc(Prediction.created_at)).first()
            rec = db.query(ReorderRecommendation).filter(ReorderRecommendation.product_id == p.id).order_by(desc(ReorderRecommendation.created_at)).first()
            recent_txs = db.query(Transaction).filter(Transaction.product_id == p.id).order_by(desc(Transaction.timestamp)).limit(5).all()

            matched_products.append({
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "current_stock": st,
                "reorder_point": p.reorder_point,
                "safety_stock": p.safety_stock,
                "lead_time_days": p.lead_time_days,
                "unit_cost": p.unit_cost,
                "supplier": p.supplier.name if p.supplier else "N/A",
                "latest_prediction": {
                    "predicted_demand": lp.predicted_demand if lp else None,
                    "stockout_risk": lp.stockout_risk if lp else None,
                    "inventory_status": lp.inventory_status if lp else None,
                    "recommended_reorder_qty": lp.recommended_reorder_quantity if lp else None,
                    "decision": lp.recommendation if lp else None
                } if lp else None,
                "reorder_recommendation": {
                    "id": rec.id,
                    "status": rec.status,
                    "urgency": rec.urgency,
                    "recommended_quantity": rec.recommended_quantity
                } if rec else None,
                "recent_transactions": [
                    {"type": tx.transaction_type, "quantity": tx.quantity, "timestamp": tx.timestamp.strftime("%Y-%m-%d %H:%M:%S")}
                    for tx in recent_txs
                ]
            })

    # 2. Gather pending reorder recommendations
    pending_reorders = db.query(ReorderRecommendation).filter(ReorderRecommendation.status == "PENDING_APPROVAL").all()
    pending_reorders_data = [
        {
            "product_id": r.product_id,
            "product_name": r.product.name if r.product else f"Product {r.product_id}",
            "current_stock": r.current_stock,
            "reorder_point": r.reorder_point,
            "recommended_quantity": r.recommended_quantity,
            "urgency": r.urgency,
            "decision": r.ai_decision
        }
        for r in pending_reorders[:10]
    ]

    # 3. Gather high risk items
    high_risk_predictions = db.query(Prediction).filter(Prediction.stockout_risk == "HIGH").order_by(desc(Prediction.created_at)).limit(10).all()
    high_risk_data = [
        {
            "product_id": pr.product_id,
            "product_name": pr.product.name if pr.product else f"Product {pr.product_id}",
            "predicted_demand": pr.predicted_demand,
            "stockout_risk": pr.stockout_risk,
            "inventory_status": pr.inventory_status,
            "recommendation": pr.recommendation
        }
        for pr in high_risk_predictions
    ]

    # 4. Gather low stock items if asked
    low_stock_data = []
    if any(k in q_lower for k in ["low stock", "lowest", "below reorder", "critical", "out of stock"]):
        for p in all_products:
            st = get_product_stock_total(db, p.id)
            if st <= p.reorder_point:
                low_stock_data.append({
                    "name": p.name,
                    "sku": p.sku,
                    "current_stock": st,
                    "reorder_point": p.reorder_point,
                    "safety_stock": p.safety_stock
                })
        low_stock_data.sort(key=lambda x: x["current_stock"])
        low_stock_data = low_stock_data[:10]

    # 5. Gather recent transactions if relevant
    recent_transactions = []
    if any(k in q_lower for k in ["transaction", "activity", "movement", "received", "issue", "sold", "today", "recent"]):
        txs = db.query(Transaction).order_by(desc(Transaction.timestamp)).limit(10).all()
        recent_transactions = [
            {
                "product_name": t.product.name if t.product else f"Product {t.product_id}",
                "type": t.transaction_type,
                "quantity": t.quantity,
                "timestamp": t.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "reason": t.reason
            }
            for t in txs
        ]

    # 6. Gather purchase orders if relevant
    purchase_orders = []
    if any(k in q_lower for k in ["order", "purchase", "po", "supplier", "delivery"]):
        pos = db.query(PurchaseOrder).order_by(desc(PurchaseOrder.order_date)).limit(10).all()
        purchase_orders = [
            {
                "po_number": po.po_number,
                "supplier_name": po.supplier.name if po.supplier else "N/A",
                "status": po.status,
                "total_amount": po.total_amount,
                "order_date": po.order_date.strftime("%Y-%m-%d") if po.order_date else None
            }
            for po in pos
        ]

    context_data = {
        "matched_products": matched_products,
        "low_stock_items": low_stock_data,
        "pending_reorders": pending_reorders_data,
        "high_risk_products": high_risk_data,
        "recent_transactions": recent_transactions,
        "purchase_orders": purchase_orders,
        "total_active_skus": len(all_products),
        "total_pending_reorders_count": len(pending_reorders)
    }

    res = gemini_service.answer_inventory_question(req.question, context_data)
    return AIChatResponse(
        success=res["success"],
        question=req.question,
        answer=res["text"],
        context_used={
            "matched_products_count": len(matched_products),
            "pending_reorders_count": len(pending_reorders_data),
            "low_stock_items_count": len(low_stock_data)
        },
        error=res.get("error")
    )

@app.post("/ai/daily-summary", response_model=AIDailySummaryResponse)
async def ai_daily_summary(db: Session = Depends(get_db)):
    """
    FEATURE 3: Daily Inventory Summary
    Generates a structured executive daily summary using real-time warehouse data and Gemini.
    """
    dash_stats = get_dashboard_data(db)
    products = db.query(Product).all()

    low_stock_list = []
    out_of_stock_list = []

    for p in products:
        st = get_product_stock_total(db, p.id)
        if st == 0:
            out_of_stock_list.append({"name": p.name, "sku": p.sku, "reorder_point": p.reorder_point})
        elif st <= p.reorder_point:
            low_stock_list.append({"name": p.name, "sku": p.sku, "current_stock": st, "reorder_point": p.reorder_point})

    high_risk_preds = db.query(Prediction).filter(Prediction.stockout_risk == "HIGH").order_by(desc(Prediction.created_at)).limit(10).all()
    high_risk_list = [
        {
            "name": hp.product.name if hp.product else f"Product {hp.product_id}",
            "predicted_demand": hp.predicted_demand,
            "risk": hp.stockout_risk,
            "recommendation": hp.recommendation
        }
        for hp in high_risk_preds
    ]

    pending_reorders = db.query(ReorderRecommendation).filter(ReorderRecommendation.status == "PENDING_APPROVAL").limit(10).all()
    pending_reorder_list = [
        {
            "name": r.product.name if r.product else f"Product {r.product_id}",
            "current_stock": r.current_stock,
            "recommended_qty": r.recommended_quantity,
            "estimated_cost": r.estimated_cost,
            "urgency": r.urgency
        }
        for r in pending_reorders
    ]

    open_pos = db.query(PurchaseOrder).filter(PurchaseOrder.status.in_(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED"])).limit(6).all()
    po_list = [
        {"po_number": po.po_number, "supplier": po.supplier.name if po.supplier else "N/A", "status": po.status, "amount": po.total_amount}
        for po in open_pos
    ]

    recent_txs = db.query(Transaction).order_by(desc(Transaction.timestamp)).limit(10).all()
    tx_list = [
        {"product": t.product.name if t.product else f"Product {t.product_id}", "type": t.transaction_type, "qty": t.quantity}
        for t in recent_txs
    ]

    summary_payload = {
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "total_skus": len(products),
        "total_stock_value": dash_stats.get("total_stock_value", 0),
        "low_stock_count": len(low_stock_list),
        "out_of_stock_count": len(out_of_stock_list),
        "high_risk_count": len(high_risk_list),
        "pending_reorders_count": len(pending_reorders),
        "open_purchase_orders_count": len(open_pos),
        "low_stock_samples": low_stock_list[:6],
        "out_of_stock_samples": out_of_stock_list[:6],
        "high_risk_samples": high_risk_list[:6],
        "pending_reorders_samples": pending_reorder_list,
        "open_pos_samples": po_list,
        "recent_transactions_samples": tx_list
    }

    res = gemini_service.generate_daily_summary(summary_payload)
    return AIDailySummaryResponse(
        success=res["success"],
        summary=res["text"],
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        kpis={
            "total_skus": len(products),
            "low_stock": len(low_stock_list),
            "out_of_stock": len(out_of_stock_list),
            "high_risk": len(high_risk_list),
            "pending_reorders": len(pending_reorders)
        },
        error=res.get("error")
    )

@app.post("/ai/report", response_model=AIReportResponse)
async def ai_generate_report(req: AIReportRequest, db: Session = Depends(get_db)):
    """
    FEATURE 4: AI Reports
    Generates structured warehouse reports using real-time data and Gemini.
    """
    dash_stats = get_dashboard_data(db)
    products = db.query(Product).all()

    report_data = {
        "report_type": req.report_type,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "dashboard_summary": {
            "total_skus": len(products),
            "total_stock_value": dash_stats.get("total_stock_value", 0),
            "low_stock_count": dash_stats.get("low_stock_count", 0),
            "out_of_stock_count": dash_stats.get("out_of_stock_count", 0),
            "high_risk_count": dash_stats.get("high_stockout_risk_count", 0),
            "open_po_count": dash_stats.get("open_purchase_orders_count", 0)
        }
    }

    if req.report_type in ["reorder_risk", "stockout_risk"]:
        recs = db.query(ReorderRecommendation).order_by(desc(ReorderRecommendation.created_at)).limit(15).all()
        report_data["reorder_recommendations"] = [
            {
                "product": r.product.name if r.product else f"Product {r.product_id}",
                "stock": r.current_stock,
                "reorder_point": r.reorder_point,
                "urgency": r.urgency,
                "decision": r.ai_decision,
                "recommended_quantity": r.recommended_quantity,
                "status": r.status
            }
            for r in recs
        ]
        preds = db.query(Prediction).filter(Prediction.stockout_risk == "HIGH").order_by(desc(Prediction.created_at)).limit(10).all()
        report_data["high_risk_items"] = [
            {
                "product": pr.product.name if pr.product else f"Product {pr.product_id}",
                "predicted_demand": pr.predicted_demand,
                "stockout_risk": pr.stockout_risk,
                "recommendation": pr.recommendation
            }
            for pr in preds
        ]
    elif req.report_type == "supplier_po":
        pos = db.query(PurchaseOrder).order_by(desc(PurchaseOrder.order_date)).limit(15).all()
        report_data["purchase_orders"] = [
            {
                "po_number": p.po_number,
                "supplier": p.supplier.name if p.supplier else "N/A",
                "status": p.status,
                "amount": p.total_amount,
                "order_date": p.order_date.strftime("%Y-%m-%d") if p.order_date else ""
            }
            for p in pos
        ]
    else:  # daily_inventory or weekly_inventory
        txs = db.query(Transaction).order_by(desc(Transaction.timestamp)).limit(20).all()
        report_data["recent_transactions"] = [
            {
                "product": t.product.name if t.product else f"Product {t.product_id}",
                "type": t.transaction_type,
                "qty": t.quantity,
                "time": t.timestamp.strftime("%Y-%m-%d %H:%M")
            }
            for t in txs
        ]

    res = gemini_service.generate_inventory_report(req.report_type, report_data)
    return AIReportResponse(
        success=res["success"],
        report_type=req.report_type,
        report=res["text"],
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        error=res.get("error")
    )

# -------------------------------------------------------------
# WEBSOCKET STREAM
# -------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial status snapshot upon connection
        from backend.database import SessionLocal
        db = SessionLocal()
        try:
            stats = get_dashboard_data(db)
            await websocket.send_json({
                "event": "INITIAL_SNAPSHOT",
                "data": {
                    "simulator_status": simulator.get_status(),
                    "agent_status": agent_tracker.state,
                    "dashboard_stats": stats
                }
            })
        finally:
            db.close()

        # Listen for any client ping/messages
        while True:
            data = await websocket.receive_text()
            # Respond to ping or client queries
            if data == "PING":
                await websocket.send_text("PONG")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)
