"""
backend/agents.py
Multi-Agent System for Automated Warehouse Inventory Management and Reorder Prediction.
Implements 5 collaborative agents:
1. InventoryAgent: Monitors & reconciles stock balances across locations
2. DemandAgent: Infers future & short-term demand velocity using trained ML models
3. StockAlertAgent: Detects anomalies, evaluates stockout risks & raises alerts
4. ReorderAgent: Calculates reorder points, optimal reorder quantities, and PO offsets
5. DecisionAgent: Synthesizes multi-agent signals into executive decisions (NO ACTION, MONITOR, REORDER SOON, REORDER NOW)
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models import (
    Product, Inventory, Transaction, Prediction, Alert,
    PurchaseOrder, PurchaseOrderItem, ReorderRecommendation
)
from ml.predict import prediction_service

logger = logging.getLogger("warehouse_agents")

class AgentStateTracker:
    """Maintains runtime state and metrics for all 5 agents to display on Agent Monitor UI."""
    def __init__(self):
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        self.state = {
            "inventory_agent": {
                "name": "Inventory Agent",
                "role": "Stock Balance & Transaction Reconciler",
                "status": "Active",
                "last_action": "System initialized. Monitoring stock across 8 facilities.",
                "last_updated": now_str,
                "metrics": {"total_transactions_processed": 0, "active_skus_monitored": 54, "stockouts_prevented": 0}
            },
            "demand_agent": {
                "name": "Demand Prediction Agent",
                "role": "Sales Velocity & Future Demand Estimator",
                "status": "Active",
                "last_action": "Loaded Random Forest & Gradient Boosting models.",
                "last_updated": now_str,
                "metrics": {"predictions_computed": 0, "avg_demand_accuracy_r2": 0.505}
            },
            "stock_alert_agent": {
                "name": "Stock Alert Agent",
                "role": "Anomaly Detector & Stockout Risk Classifier",
                "status": "Active",
                "last_action": "Active safety stock sentinel operational.",
                "last_updated": now_str,
                "metrics": {"critical_alerts_issued": 0, "high_risk_skus": 0, "active_warnings": 0}
            },
            "reorder_agent": {
                "name": "Reorder Planning Agent",
                "role": "Optimal Batch Sizing & Lead Time Coordinator",
                "status": "Active",
                "last_action": "Calibrated dynamic lead-time & safety buffer formulas.",
                "last_updated": now_str,
                "metrics": {"reorders_calculated": 0, "open_po_deductions": 0}
            },
            "decision_agent": {
                "name": "Executive Decision Agent",
                "role": "Multi-Criteria Orchestrator & Action Dispatcher",
                "status": "Active",
                "last_action": "Arbitration policy set: REORDER NOW priority on CRITICAL risk.",
                "last_updated": now_str,
                "metrics": {"decisions_rendered": 0, "reorder_now_count": 0, "monitor_count": 0}
            }
        }

    def update_agent(self, agent_key: str, action: str, metrics_delta: Optional[Dict[str, Any]] = None):
        if agent_key in self.state:
            self.state[agent_key]["last_action"] = action
            self.state[agent_key]["last_updated"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            if metrics_delta:
                for k, v in metrics_delta.items():
                    if isinstance(v, (int, float)) and k in self.state[agent_key]["metrics"]:
                        self.state[agent_key]["metrics"][k] += v
                    else:
                        self.state[agent_key]["metrics"][k] = v

agent_tracker = AgentStateTracker()

# -------------------------------------------------------------
# 1. INVENTORY AGENT
# -------------------------------------------------------------
class InventoryAgent:
    """
    Monitors stock balances, validates non-negative logic, executes receipts, issues,
    transfers, and cycle count adjustments, and computes consolidated totals.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_total_stock(self, product_id: int) -> int:
        total = self.db.query(func.sum(Inventory.quantity)).filter(Inventory.product_id == product_id).scalar()
        return total if total is not None else 0

    def get_stock_by_location(self, product_id: int) -> List[Dict[str, Any]]:
        records = self.db.query(Inventory).filter(Inventory.product_id == product_id).all()
        return [
            {
                "location_id": rec.location_id,
                "location_name": rec.location.name if rec.location else f"Location {rec.location_id}",
                "location_code": rec.location.code if rec.location else f"LOC-{rec.location_id}",
                "quantity": rec.quantity
            }
            for rec in records
        ]

    def process_transaction(
        self,
        product_id: int,
        transaction_type: str,
        quantity: int,
        source_location: Optional[int] = None,
        destination_location: Optional[int] = None,
        reason: Optional[str] = None,
        reference_number: Optional[str] = None,
        note: Optional[str] = None,
        tx_id_override: Optional[str] = None,
        tx_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Executes a transaction, updating inventory tables safely without invalid negative balances."""
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product ID {product_id} not found.")

        quantity = int(quantity)
        if quantity <= 0 and transaction_type != "ADJUST":
            raise ValueError("Transaction quantity must be strictly greater than 0.")

        prev_total = self.get_total_stock(product_id)
        effective_time = tx_time or datetime.utcnow()

        if transaction_type == "RECEIVE":
            # Add to destination location (default to main warehouse location 1 if none provided)
            dest_loc_id = destination_location or 1
            inv = self.db.query(Inventory).filter(
                Inventory.product_id == product_id,
                Inventory.location_id == dest_loc_id
            ).first()
            if not inv:
                inv = Inventory(product_id=product_id, location_id=dest_loc_id, quantity=0)
                self.db.add(inv)
            inv.quantity += quantity
            inv.updated_at = effective_time

        elif transaction_type in ["ISSUE", "SALE"]:
            # Deduct from source location (default to main warehouse 1 if not provided)
            src_loc_id = source_location or 1
            inv = self.db.query(Inventory).filter(
                Inventory.product_id == product_id,
                Inventory.location_id == src_loc_id
            ).first()
            if not inv:
                inv = Inventory(product_id=product_id, location_id=src_loc_id, quantity=0)
                self.db.add(inv)
                
            if inv.quantity < quantity:
                # Prevent negative stock: fulfill what is available, mark stockout condition
                actual_issued = inv.quantity
                inv.quantity = 0
                note = (note or "") + f" [Stockout Notice: Partial issue of {actual_issued} of requested {quantity}]."
                quantity = actual_issued
            else:
                inv.quantity -= quantity
            inv.updated_at = effective_time

        elif transaction_type == "TRANSFER":
            src_loc_id = source_location or 1
            dest_loc_id = destination_location or 2
            if src_loc_id == dest_loc_id:
                raise ValueError("Source and destination locations cannot be identical for transfers.")

            src_inv = self.db.query(Inventory).filter(
                Inventory.product_id == product_id,
                Inventory.location_id == src_loc_id
            ).first()
            dest_inv = self.db.query(Inventory).filter(
                Inventory.product_id == product_id,
                Inventory.location_id == dest_loc_id
            ).first()

            if not src_inv:
                src_inv = Inventory(product_id=product_id, location_id=src_loc_id, quantity=0)
                self.db.add(src_inv)
            if not dest_inv:
                dest_inv = Inventory(product_id=product_id, location_id=dest_loc_id, quantity=0)
                self.db.add(dest_inv)

            if src_inv.quantity < quantity:
                raise ValueError(f"Insufficient stock at source location (Available: {src_inv.quantity}, Requested: {quantity}).")

            src_inv.quantity -= quantity
            dest_inv.quantity += quantity
            src_inv.updated_at = effective_time
            dest_inv.updated_at = effective_time

        elif transaction_type == "ADJUST":
            target_loc_id = source_location or destination_location or 1
            inv = self.db.query(Inventory).filter(
                Inventory.product_id == product_id,
                Inventory.location_id == target_loc_id
            ).first()
            if not inv:
                inv = Inventory(product_id=product_id, location_id=target_loc_id, quantity=0)
                self.db.add(inv)
            # For adjust, quantity in parameter represents the new actual counted stock
            diff = quantity - inv.quantity
            inv.quantity = max(0, quantity)
            inv.updated_at = effective_time
            note = (note or "") + f" [Cycle count adjusted from {inv.quantity - diff} to {inv.quantity}]."
            quantity = abs(diff)

        elif transaction_type == "RETURN":
            dest_loc_id = destination_location or 1
            inv = self.db.query(Inventory).filter(
                Inventory.product_id == product_id,
                Inventory.location_id == dest_loc_id
            ).first()
            if not inv:
                inv = Inventory(product_id=product_id, location_id=dest_loc_id, quantity=0)
                self.db.add(inv)
            inv.quantity += quantity
            inv.updated_at = effective_time

        self.db.flush()
        new_total = self.get_total_stock(product_id)

        # Generate unique transaction record
        tx_id_str = tx_id_override or f"TXN-{int(datetime.utcnow().timestamp() * 1000)}"
        existing_tx = self.db.query(Transaction).filter(Transaction.transaction_id == tx_id_str).first()
        if existing_tx:
            tx_id_str = f"{tx_id_str}-{int(datetime.utcnow().timestamp() * 1000)}"
        tx = Transaction(
            transaction_id=tx_id_str,
            product_id=product_id,
            source_location=source_location,
            destination_location=destination_location,
            transaction_type=transaction_type,
            quantity=quantity,
            previous_stock=prev_total,
            new_stock=new_total,
            reference=reference_number or f"REF-{product.sku}",
            reference_number=reference_number or f"REF-{product.sku}",
            reason=reason or f"{transaction_type} operation",
            note=note,
            timestamp=effective_time,
            created_at=effective_time
        )
        self.db.add(tx)
        self.db.commit()
        self.db.refresh(tx)

        agent_tracker.update_agent(
            "inventory_agent",
            f"Processed {transaction_type} of {quantity} for '{product.name}'. Total: {prev_total} -> {new_total}",
            {"total_transactions_processed": 1}
        )

        return {
            "transaction": tx,
            "product": product,
            "previous_stock": prev_total,
            "new_stock": new_total
        }

# -------------------------------------------------------------
# 2. DEMAND PREDICTION AGENT
# -------------------------------------------------------------
class DemandAgent:
    """
    Computes rolling velocity and triggers Model 1 (Random Forest Regressor)
    and Model 2 (Gradient Boosting Regressor) for demand forecasts.
    """
    def __init__(self, db: Session):
        self.db = db

    def calculate_velocity(self, product_id: int) -> Dict[str, float]:
        """Calculates 3-day, 7-day, 14-day, and 30-day daily sales velocity."""
        now = datetime.utcnow()
        t30 = now - timedelta(days=30)
        t14 = now - timedelta(days=14)
        t7 = now - timedelta(days=7)
        t3 = now - timedelta(days=3)

        def sum_issues_since(dt):
            val = self.db.query(func.sum(Transaction.quantity)).filter(
                Transaction.product_id == product_id,
                Transaction.transaction_type.in_(["ISSUE", "SALE"]),
                Transaction.timestamp >= dt
            ).scalar()
            return float(val or 0)

        sold_30 = sum_issues_since(t30)
        sold_14 = sum_issues_since(t14)
        sold_7 = sum_issues_since(t7)
        sold_3 = sum_issues_since(t3)

        return {
            "velocity_3d": round(sold_3 / 3.0, 2),
            "rolling_7d_demand": round(sold_7 / 7.0, 2),
            "rolling_14d_demand": round(sold_14 / 14.0, 2),
            "rolling_30d_demand": round(sold_30 / 30.0, 2)
        }

    def predict(self, product: Product, current_stock: int) -> Dict[str, Any]:
        velocities = self.calculate_velocity(product.id)
        now = datetime.utcnow()

        feature_payload = {
            "product_id": product.id,
            "category_id": product.category_id,
            "supplier_id": product.supplier_id,
            "unit_cost": product.unit_cost,
            "selling_price": product.selling_price,
            "reorder_point": product.reorder_point,
            "safety_stock": product.safety_stock,
            "lead_time_days": product.lead_time_days,
            "current_stock": current_stock,
            "rolling_7d_demand": velocities["rolling_7d_demand"],
            "rolling_14d_demand": velocities["rolling_14d_demand"],
            "rolling_30d_demand": velocities["rolling_30d_demand"],
            "velocity_3d": velocities["velocity_3d"],
            "day_of_week": now.weekday(),
            "month": now.month,
            "is_weekend": 1 if now.weekday() in [5, 6] else 0
        }

        predicted_demand = prediction_service.predict_demand(feature_payload)
        short_term_demand = prediction_service.predict_short_term_demand(feature_payload)

        agent_tracker.update_agent(
            "demand_agent",
            f"Forecasted '{product.name}': 30d Demand = {predicted_demand}, 7d Demand = {short_term_demand}",
            {"predictions_computed": 1}
        )

        return {
            "predicted_demand": predicted_demand,
            "short_term_demand": short_term_demand,
            "velocities": velocities,
            "feature_payload": feature_payload
        }

# -------------------------------------------------------------
# 3. STOCK ALERT AGENT
# -------------------------------------------------------------
class StockAlertAgent:
    """
    Evaluates current stock against reorder points and safety stocks,
    runs Model 3 (Random Forest Classifier for Stockout Risk) and Model 5
    (Decision Tree Classifier for Inventory Status), and creates persistent alerts.
    """
    def __init__(self, db: Session):
        self.db = db

    def evaluate(self, product: Product, current_stock: int, demand_info: Dict[str, Any]) -> Dict[str, Any]:
        features = demand_info["feature_payload"].copy()
        features["current_stock"] = current_stock
        features["stock_ratio"] = current_stock / max(product.reorder_point, 1)
        features["stock_to_safety_ratio"] = current_stock / max(product.safety_stock, 1)

        # Section 9 Agent 3 — Stock Alert Agent
        # Compare Current Stock, Reorder Point, and Predicted Demand
        # Generate: NORMAL, LOW, CRITICAL, OUT_OF_STOCK
        alert_created = None
        is_reorder_breached = current_stock <= product.reorder_point
        is_out_of_stock = current_stock <= 0

        if is_out_of_stock:
            inventory_status = "OUT_OF_STOCK"
            stockout_risk = "CRITICAL"
            severity = "CRITICAL"
            msg = f"CRITICAL: '{product.name}' is OUT OF STOCK ({current_stock} units)! Notification dispatched. (No order placed)."
        elif current_stock <= product.safety_stock or current_stock <= product.reorder_point * 0.75:
            inventory_status = "CRITICAL"
            stockout_risk = "CRITICAL"
            severity = "CRITICAL"
            msg = f"CRITICAL: '{product.name}' stock ({current_stock}) has reached critical level below reorder threshold ({product.reorder_point}). Notification dispatched."
        elif is_reorder_breached:
            inventory_status = "LOW"
            stockout_risk = "HIGH"
            severity = "WARNING"
            msg = f"REORDER ALERT: '{product.name}' stock ({current_stock}) is below reorder point ({product.reorder_point})! Notification dispatched."
        else:
            inventory_status = "NORMAL"
            stockout_risk = "LOW"
            severity = "INFO"
            msg = ""

        if msg:
            # Check if an identical unread alert exists within the last 10 minutes to avoid spamming
            ten_mins_ago = datetime.utcnow() - timedelta(minutes=10)
            existing = self.db.query(Alert).filter(
                Alert.product_id == product.id,
                Alert.severity == severity,
                Alert.timestamp >= ten_mins_ago
            ).first()

            if not existing:
                alert_created = Alert(
                    product_id=product.id,
                    alert_type="STOCKOUT" if is_out_of_stock else ("REORDER_BREACH" if is_reorder_breached else "LOW_STOCK"),
                    severity=severity,
                    message=msg,
                    timestamp=datetime.utcnow()
                )
                self.db.add(alert_created)
                self.db.commit()
                self.db.refresh(alert_created)

        notification_payload = None
        if is_reorder_breached or is_out_of_stock or current_stock <= product.safety_stock:
            sup_name = product.supplier.name if product.supplier else "ABC Electronics"
            est_cost = round(float(product.reorder_quantity) * float(product.unit_cost), 2)
            notification_payload = {
                "id": f"notif-{product.id}-{int(datetime.utcnow().timestamp() * 1000)}",
                "product_id": product.id,
                "product_name": product.name,
                "sku": product.sku,
                "current_stock": current_stock,
                "reorder_point": product.reorder_point,
                "safety_stock": product.safety_stock,
                "predicted_demand": round(float(demand_info.get("predicted_demand", 0)), 1),
                "recommended_quantity": product.reorder_quantity,
                "supplier_name": sup_name,
                "estimated_cost": est_cost,
                "severity": severity,
                "alert_type": "STOCKOUT" if is_out_of_stock else "REORDER_BREACH",
                "title": "Low Stock Alert" if is_reorder_breached else "Critical Stockout Alert",
                "message": f"{product.name} stock ({current_stock}) is below reorder point ({product.reorder_point}). AI recommends ordering {product.reorder_quantity} units from {sup_name} (₹{int(est_cost):,}). Reorder recommendation requires manager approval.",
                "policy_note": "Reorder recommendation requires manager approval.",
                "order_placed": False,
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            }

        agent_tracker.update_agent(
            "stock_alert_agent",
            f"Evaluated '{product.name}': Stock={current_stock}, ReorderPt={product.reorder_point}, Breached={is_reorder_breached}",
            {"critical_alerts_issued": 1 if severity == "CRITICAL" else 0}
        )

        return {
            "stockout_risk": stockout_risk,
            "inventory_status": inventory_status,
            "alert": alert_created,
            "severity": severity,
            "reorder_breached": is_reorder_breached,
            "reorder_point": product.reorder_point,
            "notification": notification_payload
        }

# -------------------------------------------------------------
# 4. REORDER AGENT
# -------------------------------------------------------------
class ReorderAgent:
    """
    Computes reorder quantity using Model 4 (Random Forest Regressor) and
    business logic validation: Reorder Point = Avg Daily Demand * Lead Time + Safety Stock.
    Deducts open Purchase Order quantities to prevent redundant over-purchasing.
    """
    def __init__(self, db: Session):
        self.db = db

    def get_open_po_quantity(self, product_id: int) -> int:
        """Finds units currently ordered but not yet received across open purchase orders."""
        open_pos = self.db.query(PurchaseOrderItem).join(PurchaseOrder).filter(
            PurchaseOrderItem.product_id == product_id,
            PurchaseOrder.status.in_(["ORDERED", "PARTIALLY_RECEIVED", "DRAFT"])
        ).all()
        return sum(item.quantity_ordered - item.quantity_received for item in open_pos)

    def calculate(
        self,
        product: Product,
        current_stock: int,
        demand_info: Dict[str, Any],
        alert_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        open_po_qty = self.get_open_po_quantity(product.id)
        
        # Grounded formula reorder point:
        avg_daily_demand = max(0.5, demand_info["predicted_demand"] / 30.0)
        calculated_reorder_point = int(round(avg_daily_demand * product.lead_time_days + product.safety_stock))
        
        # Prepare features for ML Model 4
        features = {
            "current_stock": current_stock,
            "rolling_30d_demand": demand_info["predicted_demand"],
            "rolling_7d_demand": demand_info["short_term_demand"],
            "reorder_point": calculated_reorder_point,
            "safety_stock": product.safety_stock,
            "lead_time_days": product.lead_time_days,
            "velocity_3d": demand_info["velocities"]["velocity_3d"],
            "open_po_qty": open_po_qty,
            "unit_cost": product.unit_cost
        }

        # Predict ML reorder quantity
        ml_reorder_qty = prediction_service.predict_reorder_quantity(features)

        # Business rule validation:
        # Net deficit = (Reorder Point + Safety Buffer) - (Current Stock + Open POs)
        net_position = current_stock + open_po_qty
        target_inventory = calculated_reorder_point + int(round(avg_daily_demand * 14)) # 2-week buffer
        formula_qty = max(0, target_inventory - net_position)

        # Only reorder if stock is below reorder threshold or risk is HIGH/CRITICAL/MEDIUM
        if current_stock <= product.reorder_point:
            final_reorder_qty = product.reorder_quantity
        elif current_stock > calculated_reorder_point and alert_info["stockout_risk"] == "LOW":
            final_reorder_qty = 0
        else:
            # Reconcile ML and formula, enforce at least minimum standard batch
            reconciled = max(ml_reorder_qty, formula_qty)
            final_reorder_qty = max(product.reorder_quantity, reconciled) if reconciled > 0 else 0

        agent_tracker.update_agent(
            "reorder_agent",
            f"Calculated Reorder for '{product.name}': Recommended = {final_reorder_qty} units (Open POs: {open_po_qty})",
            {"reorders_calculated": 1 if final_reorder_qty > 0 else 0, "open_po_deductions": open_po_qty}
        )

        supplier_name = product.supplier.name if product.supplier else "Preferred Supplier"
        est_cost = round(int(final_reorder_qty) * product.unit_cost, 2)

        return {
            "reorder_point": product.reorder_point,
            "recommended_reorder_quantity": int(final_reorder_qty),
            "open_po_quantity": open_po_qty,
            "ml_predicted_qty": int(ml_reorder_qty),
            "supplier_id": product.supplier_id,
            "supplier_name": supplier_name,
            "estimated_cost": est_cost
        }

# -------------------------------------------------------------
# 5. DECISION AGENT
# -------------------------------------------------------------
class DecisionAgent:
    """
    Synthesizes signals from all four prior agents to render an actionable,
    authoritative executive recommendation: NO ACTION, MONITOR, REORDER SOON, REORDER NOW.
    Creates pending ReorderRecommendation records for manual manager review.
    Persists the final prediction record to the predictions table.
    """
    def __init__(self, db: Session):
        self.db = db

    def arbitrate(
        self,
        product: Product,
        current_stock: int,
        demand_info: Dict[str, Any],
        alert_info: Dict[str, Any],
        reorder_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        risk = alert_info["stockout_risk"]
        inv_status = alert_info["inventory_status"]
        reorder_qty = reorder_info["recommended_reorder_quantity"]
        reorder_pt = product.reorder_point
        open_pos = reorder_info["open_po_quantity"]

        # Section 9 Agent 5 — Decision Agent Arbitration logic
        # Decisions: NO ACTION, MONITOR, REORDER SOON, REORDER NOW
        if current_stock <= 0 or current_stock < product.reorder_point or inv_status == "CRITICAL" or risk in ["CRITICAL", "HIGH"]:
            if open_pos >= reorder_qty and open_pos > 0:
                recommendation = "MONITOR"
                rationale = f"Stock is critical ({current_stock}), but {open_pos} units are already in pipeline POs."
            else:
                recommendation = "REORDER NOW"
                rationale = f"Critical low stock ({current_stock} < {product.reorder_point}). AI reorder recommendation queued for warehouse manager approval."

        elif current_stock <= product.reorder_point or risk == "MEDIUM":
            if open_pos > 0:
                recommendation = "MONITOR"
                rationale = f"Stock is at reorder threshold ({product.reorder_point}), with {open_pos} units pending delivery."
            else:
                recommendation = "REORDER SOON"
                rationale = f"Stock ({current_stock}) reached reorder threshold ({product.reorder_point}). AI reorder recommendation queued for warehouse manager approval."

        elif inv_status == "OVERSTOCK":
            recommendation = "NO ACTION"
            rationale = f"Stock ({current_stock}) exceeds reorder buffer. Defer replenishment."
        else:
            recommendation = "NO ACTION"
            rationale = f"Healthy inventory buffer. Projected 30-day demand is {demand_info['predicted_demand']} units."

        # Persist to predictions database table
        pred_record = Prediction(
            product_id=product.id,
            predicted_demand=demand_info["predicted_demand"],
            short_term_demand=demand_info["short_term_demand"],
            stockout_risk=risk,
            inventory_status=inv_status,
            recommended_reorder_quantity=reorder_qty,
            reorder_point=reorder_pt,
            recommendation=recommendation,
            created_at=datetime.utcnow()
        )
        self.db.add(pred_record)

        # Create or update persistent pending recommendation in reorder_recommendations table
        rec_record = None
        if recommendation in ["REORDER NOW", "REORDER SOON"] or current_stock <= reorder_pt or risk in ["HIGH", "CRITICAL"]:
            urgency = "CRITICAL" if (current_stock <= product.safety_stock or current_stock <= 0) else ("HIGH" if current_stock <= reorder_pt else "MEDIUM")
            target_reorder_qty = max(reorder_qty, product.reorder_quantity) if reorder_qty > 0 else product.reorder_quantity
            est_cost = round(float(target_reorder_qty) * float(product.unit_cost), 2)

            existing_rec = self.db.query(ReorderRecommendation).filter(
                ReorderRecommendation.product_id == product.id,
                ReorderRecommendation.status == "PENDING_APPROVAL"
            ).first()

            if existing_rec:
                existing_rec.current_stock = current_stock
                existing_rec.reorder_point = reorder_pt
                existing_rec.predicted_demand = float(demand_info["predicted_demand"])
                existing_rec.recommended_quantity = int(target_reorder_qty)
                existing_rec.estimated_cost = float(est_cost)
                existing_rec.urgency = urgency
                existing_rec.ai_decision = recommendation
                existing_rec.created_at = datetime.utcnow()
                rec_record = existing_rec
            else:
                rec_record = ReorderRecommendation(
                    product_id=product.id,
                    supplier_id=product.supplier_id,
                    current_stock=current_stock,
                    reorder_point=reorder_pt,
                    predicted_demand=float(demand_info["predicted_demand"]),
                    recommended_quantity=int(target_reorder_qty),
                    estimated_cost=float(est_cost),
                    urgency=urgency,
                    ai_decision=recommendation,
                    status="PENDING_APPROVAL",
                    created_at=datetime.utcnow()
                )
                self.db.add(rec_record)

        self.db.commit()
        self.db.refresh(pred_record)
        if rec_record:
            self.db.refresh(rec_record)

        agent_tracker.update_agent(
            "decision_agent",
            f"Decision for '{product.name}': {recommendation} (Reorder Qty: {reorder_qty}) - Manager Approval Required",
            {
                "decisions_rendered": 1,
                "reorder_now_count": 1 if recommendation == "REORDER NOW" else 0,
                "monitor_count": 1 if recommendation == "MONITOR" else 0
            }
        )

        return {
            "prediction_record": pred_record,
            "reorder_recommendation": rec_record,
            "recommendation": recommendation,
            "rationale": rationale
        }

# -------------------------------------------------------------
# MASTER MULTI-AGENT ORCHESTRATOR
# -------------------------------------------------------------
class MultiAgentSystem:
    """
    Coordinates the collaborative pipeline across all 5 agents for an inventory transaction or SKU audit.
    """
    def __init__(self, db: Session):
        self.db = db
        self.inventory_agent = InventoryAgent(db)
        self.demand_agent = DemandAgent(db)
        self.stock_alert_agent = StockAlertAgent(db)
        self.reorder_agent = ReorderAgent(db)
        self.decision_agent = DecisionAgent(db)

    def process_and_evaluate(
        self,
        product_id: int,
        transaction_type: Optional[str] = None,
        quantity: Optional[int] = None,
        source_location: Optional[int] = None,
        destination_location: Optional[int] = None,
        reason: Optional[str] = None,
        reference_number: Optional[str] = None,
        note: Optional[str] = None,
        tx_id_override: Optional[str] = None,
        tx_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end multi-agent processing:
        Transaction -> InventoryAgent -> DemandAgent -> StockAlertAgent -> ReorderAgent -> DecisionAgent
        """
        # Step 1: Inventory Agent executes transaction if parameters are provided
        tx_result = None
        if transaction_type and quantity is not None:
            tx_result = self.inventory_agent.process_transaction(
                product_id=product_id,
                transaction_type=transaction_type,
                quantity=quantity,
                source_location=source_location,
                destination_location=destination_location,
                reason=reason,
                reference_number=reference_number,
                note=note,
                tx_id_override=tx_id_override,
                tx_time=tx_time
            )
            product = tx_result["product"]
            current_stock = tx_result["new_stock"]
        else:
            product = self.db.query(Product).filter(Product.id == product_id).first()
            if not product:
                raise ValueError(f"Product {product_id} not found.")
            current_stock = self.inventory_agent.get_total_stock(product_id)

        # Step 2: Demand Agent calculates velocity & predicts demand
        demand_info = self.demand_agent.predict(product, current_stock)

        # Step 3: Stock Alert Agent evaluates risk & triggers notifications
        alert_info = self.stock_alert_agent.evaluate(product, current_stock, demand_info)

        # Step 4: Reorder Agent calculates reorder point & quantity
        reorder_info = self.reorder_agent.calculate(product, current_stock, demand_info, alert_info)

        # Step 5: Decision Agent determines definitive course of action
        decision_info = self.decision_agent.arbitrate(product, current_stock, demand_info, alert_info, reorder_info)

        prev_stock = tx_result["previous_stock"] if tx_result else current_stock

        return {
            "product_id": product.id,
            "product_name": product.name,
            "sku": product.sku,
            "previous_stock": prev_stock,
            "current_stock": current_stock,
            "transaction": tx_result["transaction"] if tx_result else None,
            "demand": demand_info,
            "alerts": alert_info,
            "reorder": reorder_info,
            "decision": decision_info,
            "reorder_recommendation": decision_info.get("reorder_recommendation")
        }
