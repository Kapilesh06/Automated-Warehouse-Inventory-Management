"""
backend/models.py
SQLAlchemy Database Models for AI Warehouse Inventory Management System.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    products = relationship("Product", back_populates="category")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    contact_person = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    lead_time_days = Column(Integer, default=7)
    minimum_order_amount = Column(Float, default=0.0)
    reliability_rating = Column(Float, default=0.95)

    products = relationship("Product", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    type = Column(String(50), nullable=False)  # PRIMARY, DISTRIBUTION, FULFILLMENT, etc.
    address = Column(Text, nullable=True)

    inventory_items = relationship("Inventory", back_populates="location")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    barcode = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    unit = Column(String(50), default="Units")
    unit_cost = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    reorder_point = Column(Integer, default=20)
    reorder_quantity = Column(Integer, default=50)
    lead_time_days = Column(Integer, default=5)
    safety_stock = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    inventory = relationship("Inventory", back_populates="product", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="product")
    predictions = relationship("Prediction", back_populates="product", cascade="all, delete-orphan")
    reorder_recommendations = relationship("ReorderRecommendation", back_populates="product", cascade="all, delete-orphan")
    po_items = relationship("PurchaseOrderItem", back_populates="product")

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    quantity = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="inventory")
    location = relationship("Location", back_populates="inventory_items")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(50), unique=True, index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    source_location = Column(Integer, ForeignKey("locations.id"), nullable=True)
    destination_location = Column(Integer, ForeignKey("locations.id"), nullable=True)
    transaction_type = Column(String(20), nullable=False)  # SALE, RECEIVE, ADJUST, TRANSFER, RETURN, ISSUE
    quantity = Column(Integer, nullable=False)
    previous_stock = Column(Integer, default=0, nullable=True)
    new_stock = Column(Integer, default=0, nullable=True)
    reference = Column(String(100), nullable=True)
    reference_number = Column(String(100), nullable=True)
    reason = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    product = relationship("Product", back_populates="transactions")
    src_loc = relationship("Location", foreign_keys=[source_location])
    dest_loc = relationship("Location", foreign_keys=[destination_location])

class ReorderRecommendation(Base):
    __tablename__ = "reorder_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    current_stock = Column(Integer, nullable=False)
    reorder_point = Column(Integer, nullable=False)
    predicted_demand = Column(Float, nullable=False)
    recommended_quantity = Column(Integer, nullable=False)
    estimated_cost = Column(Float, nullable=False)
    urgency = Column(String(50), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    ai_decision = Column(String(50), nullable=False)  # REORDER NOW, REORDER SOON, MONITOR, NO ACTION
    status = Column(String(50), default="PENDING_APPROVAL", index=True)  # PENDING_APPROVAL, APPROVED, REJECTED, PO_CREATED
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    approved_at = Column(DateTime, nullable=True)

    product = relationship("Product", back_populates="reorder_recommendations")
    supplier = relationship("Supplier")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    status = Column(String(30), default="DRAFT", index=True)  # DRAFT, APPROVED, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    total_amount = Column(Float, default=0.0)
    order_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)
    expected_delivery_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0)
    unit_cost = Column(Float, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="po_items")

class StockCount(Base):
    __tablename__ = "stock_counts"

    id = Column(Integer, primary_key=True, index=True)
    campaign_name = Column(String(150), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    status = Column(String(30), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    location = relationship("Location")
    items = relationship("StockCountItem", back_populates="stock_count", cascade="all, delete-orphan")

class StockCountItem(Base):
    __tablename__ = "stock_count_items"

    id = Column(Integer, primary_key=True, index=True)
    stock_count_id = Column(Integer, ForeignKey("stock_counts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    expected_quantity = Column(Integer, nullable=False)
    actual_quantity = Column(Integer, nullable=False)
    variance = Column(Integer, nullable=False)

    stock_count = relationship("StockCount", back_populates="items")
    product = relationship("Product")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    predicted_demand = Column(Float, nullable=False)
    short_term_demand = Column(Float, nullable=False)
    stockout_risk = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH
    inventory_status = Column(String(20), nullable=False)  # OVERSTOCK, NORMAL, LOW, CRITICAL
    recommended_reorder_quantity = Column(Integer, nullable=False)
    reorder_point = Column(Integer, nullable=False)
    recommendation = Column(String(50), nullable=False)  # NO ACTION, MONITOR, REORDER SOON, REORDER NOW
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    product = relationship("Product", back_populates="predictions")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    alert_type = Column(String(50), nullable=False)  # STOCKOUT, LOW_STOCK, OVERDUE_PO, VELOCITY_SPIKE, GENERAL
    severity = Column(String(20), default="WARNING")  # INFO, WARNING, CRITICAL
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    is_read = Column(Boolean, default=False)

    product = relationship("Product")
