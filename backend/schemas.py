"""
backend/schemas.py
Pydantic Schemas for Request Validation and Response Serialization.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# -----------------------------
# Category Schemas
# -----------------------------
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryOut(CategoryBase):
    id: int
    class Config:
        from_attributes = True

# -----------------------------
# Supplier Schemas
# -----------------------------
class SupplierBase(BaseModel):
    supplier_code: str
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: int = 7
    minimum_order_amount: float = 0.0
    reliability_rating: float = 0.95

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    active_sku_count: Optional[int] = 0
    open_po_count: Optional[int] = 0
    open_po_value: Optional[float] = 0.0
    class Config:
        from_attributes = True

# -----------------------------
# Location Schemas
# -----------------------------
class LocationBase(BaseModel):
    name: str
    code: str
    type: str
    address: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationOut(LocationBase):
    id: int
    class Config:
        from_attributes = True

# -----------------------------
# Product Schemas
# -----------------------------
class ProductBase(BaseModel):
    sku: str
    barcode: str
    name: str
    category_id: int
    supplier_id: int
    unit: str = "Units"
    unit_cost: float
    selling_price: float
    reorder_point: int = 20
    reorder_quantity: int = 50
    lead_time_days: int = 5
    safety_stock: int = 10

class ProductCreate(ProductBase):
    pass

class InventoryByLocation(BaseModel):
    location_id: int
    location_name: str
    location_code: str
    quantity: int

class ProductOut(ProductBase):
    id: int
    created_at: Optional[datetime] = None
    category_name: Optional[str] = None
    supplier_name: Optional[str] = None
    current_stock: Optional[int] = 0
    margin: Optional[float] = 0.0
    stock_status: Optional[str] = "IN STOCK" # IN STOCK, LOW STOCK, OUT OF STOCK
    latest_prediction: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True

# -----------------------------
# Inventory Schemas
# -----------------------------
class InventoryOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    location_id: int
    location_name: str
    location_code: str
    quantity: int
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# -----------------------------
# Transaction Schemas
# -----------------------------
class TransactionBase(BaseModel):
    product_id: int
    transaction_type: str # RECEIVE, ISSUE, ADJUST, TRANSFER, RETURN
    quantity: int = Field(gt=0, description="Quantity must be strictly positive")
    source_location: Optional[int] = None
    destination_location: Optional[int] = None
    reason: Optional[str] = None
    reference_number: Optional[str] = None
    note: Optional[str] = None

class TransactionCreate(TransactionBase):
    previous_stock: Optional[int] = None
    new_stock: Optional[int] = None
    reference: Optional[str] = None

class TransactionOut(BaseModel):
    id: int
    transaction_id: str
    product_id: int
    product_name: Optional[str] = None
    sku: Optional[str] = None
    source_location: Optional[int] = None
    source_location_name: Optional[str] = None
    destination_location: Optional[int] = None
    destination_location_name: Optional[str] = None
    transaction_type: str
    quantity: int
    previous_stock: Optional[int] = 0
    new_stock: Optional[int] = 0
    reference: Optional[str] = None
    reason: Optional[str] = None
    reference_number: Optional[str] = None
    note: Optional[str] = None
    timestamp: datetime
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# Stock Operation Specific Forms
class StockReceiveRequest(BaseModel):
    product_id: int
    destination_location: int
    quantity: int = Field(gt=0)
    reference_number: Optional[str] = None
    reason: Optional[str] = "Manual Stock Receipt"
    note: Optional[str] = None

class StockIssueRequest(BaseModel):
    product_id: int
    source_location: int
    quantity: int = Field(gt=0)
    reference_number: Optional[str] = None
    reason: Optional[str] = "Manual Stock Issue"
    note: Optional[str] = None

class StockAdjustRequest(BaseModel):
    product_id: int
    location_id: int
    actual_quantity: int = Field(ge=0)
    reason: Optional[str] = "Physical Count Adjustment"
    note: Optional[str] = None

class StockTransferRequest(BaseModel):
    product_id: int
    source_location: int
    destination_location: int
    quantity: int = Field(gt=0)
    reason: Optional[str] = "Inter-warehouse Transfer"
    note: Optional[str] = None

class StockReturnRequest(BaseModel):
    product_id: int
    destination_location: int
    quantity: int = Field(gt=0)
    reason: Optional[str] = "Customer / RMA Return"
    note: Optional[str] = None

# -----------------------------
# Purchase Order Schemas
# -----------------------------
class POItemCreate(BaseModel):
    product_id: int
    quantity_ordered: int = Field(gt=0)
    unit_cost: float = Field(ge=0)

class POItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    quantity_ordered: int
    quantity_received: int
    unit_cost: float
    class Config:
        from_attributes = True

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[POItemCreate]

class POReceiveItemRequest(BaseModel):
    item_id: Optional[int] = None
    quantity_to_receive: Optional[int] = None
    received_quantity: Optional[int] = None
    location_id: Optional[int] = 1  # default to main warehouse if omitted
    reference_number: Optional[str] = "INV-1001"
    note: Optional[str] = None

class POReceiveStockRequest(BaseModel):
    received_quantity: int = Field(gt=0, description="Quantity received from supplier")
    item_id: Optional[int] = None
    location_id: Optional[int] = 1
    reference_number: Optional[str] = "INV-1001"
    note: Optional[str] = None

class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    status: str
    order_date: datetime
    created_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    expected_delivery_date: Optional[datetime] = None
    total_amount: float
    notes: Optional[str] = None
    items: List[POItemOut] = []
    class Config:
        from_attributes = True

# -----------------------------
# Reorder Recommendation Schemas
# -----------------------------
class ReorderRecommendationOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    sku: Optional[str] = None
    supplier_id: int
    supplier_name: Optional[str] = None
    current_stock: int
    reorder_point: int
    predicted_demand: float
    recommended_quantity: int
    estimated_cost: float
    unit_cost: Optional[float] = 0.0
    urgency: str
    ai_decision: str
    status: str
    created_at: datetime
    approved_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ReorderRecommendationApprovalResponse(BaseModel):
    status: str
    recommendation_id: int
    po_id: int
    po_number: str
    po_status: str
    current_stock: int
    message: str

class ReorderRecommendationRejectResponse(BaseModel):
    status: str
    recommendation_id: int
    message: str

# -----------------------------
# Stock Count Schemas
# -----------------------------
class StockCountItemCreate(BaseModel):
    product_id: int
    actual_quantity: int

class StockCountCreate(BaseModel):
    campaign_name: str
    location_id: int
    items: List[StockCountItemCreate]

class StockCountItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    expected_quantity: int
    actual_quantity: int
    variance: int
    class Config:
        from_attributes = True

class StockCountOut(BaseModel):
    id: int
    campaign_name: str
    location_id: int
    location_name: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    items: List[StockCountItemOut] = []
    class Config:
        from_attributes = True

# -----------------------------
# Prediction & Alert Schemas
# -----------------------------
class PredictionOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    sku: Optional[str] = None
    predicted_demand: float
    short_term_demand: float
    stockout_risk: str
    inventory_status: str
    recommended_reorder_quantity: int
    reorder_point: int
    recommendation: str
    created_at: datetime
    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    alert_type: str
    severity: str
    message: str
    timestamp: datetime
    is_read: bool
    class Config:
        from_attributes = True

# -----------------------------
# AI Reorder Plan Schemas
# -----------------------------
class AIReorderPlanRequest(BaseModel):
    budget: Optional[float] = None
    priority_note: Optional[str] = None
    product_ids: Optional[List[int]] = None

class ReorderItemDetail(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    reorder_point: int
    predicted_demand: float
    short_term_demand: float
    open_po_quantity: int
    recommended_quantity: int
    unit_cost: float
    estimated_cost: float
    supplier_id: int
    supplier_name: str
    lead_time_days: int
    stockout_risk: str
    inventory_status: str
    urgency: str # CRITICAL, HIGH, MEDIUM, LOW

class SupplierConsolidation(BaseModel):
    supplier_id: int
    supplier_name: str
    lead_time_days: int
    item_count: int
    total_quantity: int
    total_cost: float
    items: List[ReorderItemDetail]

class AIReorderPlanResponse(BaseModel):
    executive_summary: Dict[str, Any]
    recommended_actions: Dict[str, List[ReorderItemDetail]] # grouped by CRITICAL, HIGH, MEDIUM
    supplier_consolidation: List[SupplierConsolidation]
    risk_callouts: List[str]
    budget_summary: Dict[str, Any]
    generated_at: str

# -----------------------------
# Simulation Schemas
# -----------------------------
class SimulationStatusResponse(BaseModel):
    status: str # STOPPED, RUNNING, PAUSED, COMPLETED
    running: Optional[bool] = False
    paused: Optional[bool] = False
    current_index: Optional[int] = 0
    total_transactions: Optional[int] = 0
    progress_percentage: Optional[float] = 0.0
    delay_seconds: Optional[float] = 5.0
    speed_seconds: Optional[float] = 5.0
    transactions_generated: Optional[int] = 0
    current_simulated_date: Optional[str] = None
    last_processed_tx: Optional[Dict[str, Any]] = None
    last_transaction: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

class SimulationSpeedRequest(BaseModel):
    delay_seconds: float = Field(ge=0.2, le=30.0)

# -----------------------------
# Multi-Agent Status Schemas
# -----------------------------
class AgentInfo(BaseModel):
    name: str
    role: str
    status: str
    last_action: str
    last_updated: str
    metrics: Dict[str, Any]

class AgentsStatusResponse(BaseModel):
    inventory_agent: AgentInfo
    demand_agent: AgentInfo
    stock_alert_agent: AgentInfo
    reorder_agent: AgentInfo
    decision_agent: AgentInfo

# -----------------------------
# Dashboard Summary Schemas
# -----------------------------
class DashboardStats(BaseModel):
    total_skus: int
    total_stock_value: float
    low_stock_count: int
    out_of_stock_count: int
    open_purchase_orders_count: int
    open_purchase_orders_value: float
    transactions_30d_count: int
    predicted_30d_demand_total: float
    high_stockout_risk_count: int
    pending_reorders_count: int
    pending_ai_recommendations: int = 0
    approved_reorders: int = 0
    pending_purchase_orders: int = 0
    orders_received: int = 0
    low_stock_items: int = 0
    out_of_stock_items: int = 0
    ai_reorder_alerts: List[Dict[str, Any]] = []
    recent_alerts: List[AlertOut]
    recent_transactions: List[TransactionOut]
    charts: Dict[str, Any]

# -----------------------------
# Generative AI (Gemini) Schemas
# -----------------------------
class AIExplainReorderRequest(BaseModel):
    product_id: Optional[int] = None
    recommendation_id: Optional[int] = None

class AIExplainReorderResponse(BaseModel):
    success: bool
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    explanation: str
    structured_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class AIChatRequest(BaseModel):
    question: str

class AIChatResponse(BaseModel):
    success: bool
    question: str
    answer: str
    context_used: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class AIDailySummaryResponse(BaseModel):
    success: bool
    summary: str
    generated_at: str
    kpis: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class AIReportRequest(BaseModel):
    report_type: str = "daily_inventory"

class AIReportResponse(BaseModel):
    success: bool
    report_type: str
    report: str
    generated_at: str
    error: Optional[str] = None

class AIStatusResponse(BaseModel):
    configured: bool
    model: str
    provider: str = "Google Gemini"
