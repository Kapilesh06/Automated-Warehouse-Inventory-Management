"""
backend/simulator.py
Real-Time Customer Purchase Simulator.
Generates NEW customer purchase transactions dynamically from the CURRENT INVENTORY DATABASE.
Decreases database inventory safely without negative stock, triggers the 5 AI agents,
and broadcasts live updates over WebSocket to the dashboard.
HISTORICAL DATA NOTE: warehouse_transactions.csv is preserved for ML model training ONLY.
"""

import os
import random
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List

from backend.database import SessionLocal
from backend.models import Product, Inventory, Transaction, Prediction
from backend.agents import MultiAgentSystem
from backend.services import get_dashboard_data
from backend.websocket_manager import ws_manager

logger = logging.getLogger("warehouse_simulator")

class TransactionSimulator:
    def __init__(self):
        self.status: str = "STOPPED"  # STOPPED, RUNNING, PAUSED
        self.delay_seconds: float = 5.0  # default 5 seconds
        self.transactions_generated: int = 0
        self.last_processed_tx: Optional[Dict[str, Any]] = None
        self.last_message: Optional[str] = None
        self._task: Optional[Any] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._init_tx_counter()

    def _init_tx_counter(self):
        """Initializes the counter based on existing SIM- transactions in the database."""
        try:
            db = SessionLocal()
            try:
                count = db.query(Transaction).filter(Transaction.transaction_id.like("SIM-%")).count()
                self.transactions_generated = count
                logger.info(f"[Simulator] Initialized with {self.transactions_generated} existing simulation transactions.")
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"[Simulator] Could not initialize transaction counter from DB: {e}")
            self.transactions_generated = 0

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        """Registers the active ASGI event loop for background task creation."""
        self._loop = loop

    def _schedule_task(self):
        """Safely schedules the simulation loop whether called from async route or worker thread."""
        loop = None
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            if self._loop and self._loop.is_running():
                loop = self._loop

        if loop is None:
            raise RuntimeError("No active asyncio event loop found for TransactionSimulator.")

        try:
            curr_loop = asyncio.get_running_loop()
            if curr_loop is loop:
                self._task = loop.create_task(self._run_loop())
            else:
                self._task = asyncio.run_coroutine_threadsafe(self._run_loop(), loop)
        except RuntimeError:
            self._task = asyncio.run_coroutine_threadsafe(self._run_loop(), loop)

    def start(self, start_from_index: Optional[int] = None):
        """Starts real-time customer purchase simulation against the live inventory database."""
        if self.status == "RUNNING":
            logger.info("[Simulator] Already running.")
            return

        self.status = "RUNNING"
        self.last_message = None
        self._schedule_task()
        logger.info(f"[Simulator] Real-time customer purchase simulation started with {self.delay_seconds}s interval.")

    def pause(self):
        """Pauses the simulation without resetting progress."""
        if self.status == "RUNNING":
            self.status = "PAUSED"
            if self._task:
                if hasattr(self._task, "cancel"):
                    self._task.cancel()
            logger.info(f"[Simulator] Simulation paused. Total transactions generated: {self.transactions_generated}.")

    def resume(self):
        """Resumes a paused simulation."""
        if self.status == "PAUSED":
            self.status = "RUNNING"
            self.last_message = None
            self._schedule_task()
            logger.info(f"[Simulator] Simulation resumed.")

    def stop(self):
        """Stops the simulation."""
        self.status = "STOPPED"
        if self._task:
            if hasattr(self._task, "cancel"):
                self._task.cancel()
        logger.info(f"[Simulator] Simulation stopped. Total purchases generated: {self.transactions_generated}.")

    def set_speed(self, delay_seconds: float):
        """Updates the delay interval between simulated customer purchases."""
        self.delay_seconds = max(0.2, min(float(delay_seconds), 30.0))
        logger.info(f"[Simulator] Simulation interval updated to {self.delay_seconds} seconds.")

    def get_status(self) -> Dict[str, Any]:
        """Returns comprehensive status telemetry matching existing and new API specifications."""
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        last_tx_summary = None
        if self.last_processed_tx:
            last_tx_summary = {
                "transaction_id": self.last_processed_tx.get("transaction_id"),
                "customer_id": self.last_processed_tx.get("customer_id"),
                "product": self.last_processed_tx.get("product_name"),
                "quantity": self.last_processed_tx.get("quantity"),
                "timestamp": self.last_processed_tx.get("timestamp")
            }

        return {
            "status": self.status,
            "running": self.status == "RUNNING",
            "paused": self.status == "PAUSED",
            "current_index": self.transactions_generated,
            "total_transactions": self.transactions_generated,
            "progress_percentage": 100.0 if self.status == "RUNNING" else 0.0,
            "delay_seconds": self.delay_seconds,
            "speed_seconds": self.delay_seconds,
            "transactions_generated": self.transactions_generated,
            "current_simulated_date": now_str,
            "last_processed_tx": self.last_processed_tx,
            "last_transaction": last_tx_summary,
            "message": self.last_message
        }

    async def _run_loop(self):
        """
        Continuous real-time customer purchase loop:
        1. Queries current inventory database for products with available stock (quantity > 0).
        2. Selects an available product (weighted by demand).
        3. Generates realistic purchase quantity constrained by current stock.
        4. Decrements database inventory & records transaction.
        5. Executes 5 AI agents (Demand, Alert, Reorder, Decision).
        6. Broadcasts real-time WebSocket updates to frontend.
        7. Sleeps for configured interval.
        """
        try:
            while self.status == "RUNNING":
                db = SessionLocal()
                try:
                    # 1. Query current inventory database for available in-stock items
                    available_inv_records: List[Inventory] = (
                        db.query(Inventory)
                        .join(Product, Inventory.product_id == Product.id)
                        .filter(Inventory.quantity > 0)
                        .all()
                    )

                    # If no products currently have available stock, pause simulation as specified
                    if not available_inv_records:
                        self.status = "PAUSED"
                        self.last_message = "No products currently available for purchase."
                        logger.warning("[Simulator] No products currently available for purchase. Simulation paused.")
                        await ws_manager.broadcast({
                            "event": "SIMULATION_PAUSED",
                            "data": {
                                "message": "No products currently available for purchase.",
                                "simulator_status": self.get_status()
                            }
                        })
                        break

                    # Group available inventory records by product_id
                    product_candidates: Dict[int, List[Inventory]] = {}
                    for inv in available_inv_records:
                        if inv.product_id not in product_candidates:
                            product_candidates[inv.product_id] = []
                        product_candidates[inv.product_id].append(inv)

                    candidate_pids = list(product_candidates.keys())

                    # 2. Demand-weighted selection among available products
                    weights = []
                    for pid in candidate_pids:
                        pred = (
                            db.query(Prediction)
                            .filter(Prediction.product_id == pid)
                            .order_by(Prediction.created_at.desc())
                            .first()
                        )
                        # Higher predicted demand products have higher purchase frequency
                        w = max(1.0, float(pred.predicted_demand)) if pred and pred.predicted_demand else 1.0
                        weights.append(w)

                    selected_pid = random.choices(candidate_pids, weights=weights, k=1)[0]
                    product = db.query(Product).filter(Product.id == selected_pid).first()

                    if not product:
                        continue

                    # Select location that holds stock for this product (prefer primary location 1 if in stock)
                    loc_options = product_candidates[selected_pid]
                    primary_loc = next((loc for loc in loc_options if loc.location_id == 1 and loc.quantity > 0), None)
                    selected_inv = primary_loc if primary_loc else random.choice(loc_options)
                    available_stock = selected_inv.quantity

                    # 3. Generate realistic customer purchase quantity
                    # Scale realistic quantity based on item unit cost
                    if product.unit_cost > 5000:
                        target_qty = random.randint(1, 3)
                    elif product.unit_cost > 1000:
                        target_qty = random.randint(1, 5)
                    else:
                        target_qty = random.randint(1, 8)

                    # CRITICAL BUSINESS RULE: constrain quantity to never exceed available stock
                    # quantity = min(generated_quantity, current_stock)
                    purchase_qty = max(1, min(target_qty, available_stock))

                    # 4. Realistic customer & transaction information
                    self.transactions_generated += 1
                    cust_seq = 1000 + (self.transactions_generated % 9000)
                    customer_id = f"CUST-{cust_seq}"
                    tx_id_override = f"SIM-{self.transactions_generated:06d}"
                    ref_no = f"ORD-{customer_id}"
                    reason = f"Customer Purchase ({customer_id})"
                    note = f"Real-time customer purchase: {customer_id} bought {purchase_qty} unit(s) of {product.name} (Source: SIMULATOR)."
                    tx_time = datetime.utcnow()

                    # 5. Process through the 5-Agent Pipeline
                    # Inventory Agent -> Demand Agent -> Alert Agent -> Reorder Agent -> Decision Agent
                    agent_sys = MultiAgentSystem(db)
                    result = agent_sys.process_and_evaluate(
                        product_id=product.id,
                        transaction_type="SALE",
                        quantity=purchase_qty,
                        source_location=selected_inv.location_id,
                        destination_location=None,
                        reason=reason,
                        reference_number=ref_no,
                        note=note,
                        tx_id_override=tx_id_override,
                        tx_time=tx_time
                    )

                    actual_tx_id = (
                        result["transaction"].transaction_id
                        if (result and result.get("transaction") and hasattr(result["transaction"], "transaction_id"))
                        else tx_id_override
                    )

                    # Prepare telemetry and notification summary
                    notification = result["alerts"].get("notification")
                    reorder_breached = result["alerts"].get("reorder_breached", False)
                    reorder_pt = result["alerts"].get("reorder_point", product.reorder_point)
                    prev_stock = result.get("previous_stock", result["current_stock"] + purchase_qty)
                    curr_stock = result["current_stock"]
                    ai_decision = result["decision"]["recommendation"]
                    rec_qty = result["reorder"]["recommended_reorder_quantity"]
                    sup_name = result["reorder"].get("supplier_name", product.supplier.name if product.supplier else "Standard Supplier")
                    est_cost = result["reorder"].get("estimated_cost", 0)

                    is_reorder_candidate = (
                        reorder_breached or
                        ai_decision in ["REORDER NOW", "REORDER SOON"] or
                        curr_stock <= reorder_pt
                    )

                    self.last_processed_tx = {
                        "index": self.transactions_generated,
                        "transaction_id": actual_tx_id,
                        "customer_id": customer_id,
                        "product_id": product.id,
                        "product_name": result["product_name"],
                        "sku": result["sku"],
                        "transaction_type": "SALE",
                        "quantity": purchase_qty,
                        "unit_price": product.selling_price,
                        "previous_stock": prev_stock,
                        "current_stock": curr_stock,
                        "new_stock": curr_stock,
                        "reorder_point": reorder_pt,
                        "reorder_breached": reorder_breached,
                        "ai_decision": ai_decision,
                        "decision": ai_decision,
                        "recommendation": f"{rec_qty} units",
                        "recommended_reorder_qty": rec_qty,
                        "supplier_name": sup_name,
                        "estimated_cost": est_cost,
                        "approval": "PENDING" if is_reorder_candidate else "N/A",
                        "approval_status": "PENDING" if is_reorder_candidate else "N/A",
                        "status": "PENDING" if is_reorder_candidate else "N/A",
                        "notification": notification,
                        "order_placed": False,
                        "timestamp": tx_time.strftime("%Y-%m-%d %H:%M:%S"),
                        "simulated_date": tx_time.strftime("%Y-%m-%d %H:%M:%S"),
                        "stockout_risk": result["alerts"]["stockout_risk"],
                        "inventory_status": result["alerts"]["inventory_status"],
                        "predicted_demand": result["demand"]["predicted_demand"],
                        "short_term_demand": result["demand"]["short_term_demand"],
                        "source": "SIMULATOR"
                    }

                    # Fetch live dashboard stats for real-time graphs and counters
                    dash_stats = get_dashboard_data(db)

                    # Broadcast real-time WebSocket packet to all connected clients
                    await ws_manager.broadcast({
                        "event": "SIMULATION_TRANSACTION",
                        "data": {
                            "simulator_status": self.get_status(),
                            "processed_transaction": self.last_processed_tx,
                            "dashboard_stats": dash_stats,
                            "notification": notification,
                            "reorder_breached": reorder_breached,
                            "order_placed": False
                        }
                    })

                    # Broadcast stock updated event
                    await ws_manager.broadcast({
                        "event": "STOCK_UPDATED",
                        "data": {
                            "product_id": product.id,
                            "product_name": result["product_name"],
                            "sku": result["sku"],
                            "previous_stock": prev_stock,
                            "current_stock": curr_stock,
                            "reorder_point": reorder_pt,
                            "ai_status": result["alerts"]["inventory_status"],
                            "ai_decision": ai_decision,
                            "recommendation": f"{rec_qty} units",
                            "supplier_name": sup_name,
                            "approval": "PENDING" if is_reorder_candidate else "N/A",
                            "dashboard_stats": dash_stats
                        }
                    })

                    # If reorder recommended, broadcast specific AI_REORDER_ALERT
                    if is_reorder_candidate:
                        await ws_manager.broadcast({
                            "event": "AI_REORDER_ALERT",
                            "data": {
                                "product_id": product.id,
                                "product_name": result["product_name"],
                                "current_stock": curr_stock,
                                "reorder_point": reorder_pt,
                                "predicted_demand": result["demand"]["predicted_demand"],
                                "recommended_order": rec_qty,
                                "supplier_name": sup_name,
                                "estimated_cost": est_cost,
                                "urgency": "CRITICAL" if curr_stock <= 0 or curr_stock <= product.safety_stock else ("HIGH" if curr_stock <= reorder_pt else "MEDIUM"),
                                "decision": ai_decision,
                                "status": "Pending Approval",
                                "message": f"🔔 AI Reorder Alert: {result['product_name']} stock ({curr_stock}) is below reorder point ({reorder_pt}). Recommended Order: {rec_qty} units from {sup_name}. Reorder recommendation requires manager approval."
                            }
                        })

                except Exception as e:
                    logger.error(f"[Simulator] Error generating customer transaction: {e}", exc_info=True)
                finally:
                    db.close()

                # Sleep for user-configured interval (asynchronous, non-blocking)
                try:
                    await asyncio.sleep(self.delay_seconds)
                except asyncio.CancelledError:
                    break

        except asyncio.CancelledError:
            logger.info("[Simulator] Simulation loop cancelled.")
        except Exception as e:
            logger.error(f"[Simulator] Fatal error in simulation loop: {e}", exc_info=True)

# Global singleton simulator
simulator = TransactionSimulator()
