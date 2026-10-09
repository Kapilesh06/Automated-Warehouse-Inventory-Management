# Multi-Agent System for Automated Warehouse Inventory Management and Reorder Prediction

> “The proposed system is a multi-agent AI-based warehouse inventory management system that monitors simulated customer transactions, predicts future demand, detects potential stockouts, and recommends when and how much inventory should be reordered. The system follows a human-in-the-loop approach where AI agents provide reorder recommendations, while the warehouse manager retains control over supplier ordering and stock receiving. The transaction simulator only simulates item demand and customer orders; it does not automatically purchase products from suppliers.”

---

### IMPORTANT BUSINESS RULE: HUMAN-IN-THE-LOOP CONTROL

The transaction simulator represents only **customer/warehouse item orders and stock consumption (`SALE`/`ISSUE`)**. It does **NOT automatically purchase products from suppliers**.

The AI system can:
* monitor inventory
* predict demand
* detect low/critical stock
* calculate reorder recommendations
* notify the warehouse manager
* suggest which supplier to order from
* suggest reorder quantity
* create a DRAFT purchase order after manager approval

The AI system must NOT:
* automatically place an order with the supplier
* automatically receive products from the supplier
* automatically increase inventory because of an AI recommendation
* automatically complete a purchase order

The **warehouse manager/user must approve the reorder manually**.

---

## 1. System Architecture & Workflow

```text
                CUSTOMER ORDER
                      ↓
             TRANSACTION SIMULATOR
                      ↓
              INVENTORY AGENT
                      ↓
             STOCK UPDATED (-)
                      ↓
        ┌─────────────┴─────────────┐
        ↓                           ↓
 DEMAND PREDICTION            STOCK ALERT
      AGENT                       AGENT
        └─────────────┬─────────────┘
                      ↓
                REORDER AGENT
                      ↓
                DECISION AGENT
                      ↓
             AI RECOMMENDATION
                      ↓
              MANAGER NOTIFICATION
                      ↓
              ┌───────┴───────┐
              ↓               ↓
           APPROVE           REJECT
              ↓
       DRAFT PURCHASE ORDER
              ↓
       MANAGER ORDERS FROM
           SUPPLIER
              ↓
        SUPPLIER DELIVERS
              ↓
       MANAGER RECEIVES STOCK
              ↓
          STOCK UPDATED (+)
              ↓
        INVENTORY DASHBOARD
```
                              ▼
                      MULTI-AGENT SYSTEM
                     (backend/agents.py)
                              │
       ┌──────────────┬───────┼───────┬──────────────┐
       ▼              ▼       ▼       ▼              ▼
   Inventory       Demand   Alert  Reorder       Decision
     Agent         Agent    Agent   Agent          Agent
       │              │       │       │              │
       └──────────────┴───────┼───────┴──────────────┘
                              ▼
                       DATABASE / STATE
                       (SQLite: ORM)
                              │
                              ▼
                          WEBSOCKET
                          (/ws stream)
                              │
                              ▼
                      REACT.JS FRONTEND
                     (Vite + Recharts)
                              │
                              ▼
                     WAREHOUSE DASHBOARD
```

---

## 3. Technology Stack

- **Frontend**: React.js, Vite, Plus Jakarta Sans & JetBrains Mono typography, Lucide React icons, Recharts for data analytics. Custom dark/slate design system with glassmorphic depth and CSS tokens.
- **Backend**: Python 3.11, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy ORM.
- **Database**: SQLite (relational schema supporting products, categories, suppliers, locations, inventory, transactions, purchase orders, cycle counts, predictions, alerts).
- **Machine Learning**: Scikit-Learn, Pandas, NumPy, Joblib (Random Forest, Gradient Boosting, Decision Tree).
- **Real-Time Streaming**: Native WebSockets (`/ws`) broadcasting event packets on every transaction.

---

## 4. Database Schema

The SQLite relational database maintains strict referential integrity across 12 tables:

1. **`products`**: `id`, `sku`, `barcode`, `name`, `category_id`, `supplier_id`, `unit`, `unit_cost`, `selling_price`, `reorder_point`, `reorder_quantity`, `lead_time_days`, `safety_stock`, `created_at`
2. **`categories`**: `id`, `name`, `description` (8 categories)
3. **`suppliers`**: `id`, `supplier_code`, `name`, `contact_person`, `email`, `phone`, `address`, `lead_time_days`, `minimum_order_amount`, `reliability_rating` (8 suppliers)
4. **`locations`**: `id`, `name`, `code`, `type`, `address` (8 facilities)
5. **`inventory`**: `id`, `product_id`, `location_id`, `quantity`, `updated_at` (432 SKU-location balances)
6. **`transactions`**: `id`, `transaction_id`, `product_id`, `source_location`, `destination_location`, `transaction_type`, `quantity`, `reason`, `reference_number`, `note`, `timestamp`
7. **`purchase_orders`**: `id`, `po_number`, `supplier_id`, `status` (DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED), `order_date`, `expected_delivery_date`, `total_amount`, `notes`
8. **`purchase_order_items`**: `id`, `purchase_order_id`, `product_id`, `quantity_ordered`, `quantity_received`, `unit_cost`
9. **`stock_counts`**: `id`, `campaign_name`, `location_id`, `status`, `created_at`, `completed_at`
10. **`stock_count_items`**: `id`, `stock_count_id`, `product_id`, `expected_quantity`, `actual_quantity`, `variance`
11. **`predictions`**: `id`, `product_id`, `predicted_demand`, `short_term_demand`, `stockout_risk`, `inventory_status`, `recommended_reorder_quantity`, `reorder_point`, `recommendation`, `created_at`
12. **`alerts`**: `id`, `product_id`, `alert_type`, `severity`, `message`, `timestamp`, `is_read`

---

## 5. Machine Learning Models & Evaluation

The system trains 5 separate models using strictly chronological train-test splits (avoiding forward data leakage):

| Model | Purpose | Algorithm | Key Metrics | Saved Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **Model 1: Demand Prediction** | 30-Day Forward Demand | Random Forest Regressor | MAE: 104.40, RMSE: 162.53, R²: 0.22 | `models/demand_model.pkl` |
| **Model 2: Short-Term Demand** | 7-Day Velocity Demand | Gradient Boosting Regressor | MAE: 27.54, RMSE: 42.11, R²: 0.51 | `models/short_term_demand_model.pkl` |
| **Model 3: Stockout Risk** | Stockout Classification (LOW, MED, HIGH) | Random Forest Classifier | Accuracy: 98.25%, F1: 0.98 | `models/stockout_model.pkl` |
| **Model 4: Reorder Quantity** | Optimal Replenishment Batch | Random Forest Regressor | MAE: 2.57 units, RMSE: 17.95 | `models/reorder_model.pkl` |
| **Model 5: Inventory Status** | Health (OVERSTOCK, NORMAL, LOW, CRITICAL) | Decision Tree Classifier | Accuracy: 100.0%, Depth: 6 | `models/inventory_status_model.pkl` |

All metrics and model parameters are persisted to `models/model_metrics.json`.

---

## 6. The 5 Collaborative Agents

Implemented in [agents.py](file:///d:/mini%20project%203/backend/agents.py):

1. **Inventory Agent**:
   - Reconciles warehouse stock balances across 8 facilities.
   - Enforces non-negative inventory constraints (flags stockout events if shortage occurs).
   - Records transaction logs for receipts, issues, transfers, and count adjustments.
2. **Demand Prediction Agent**:
   - Calculates 3-day, 7-day, 14-day, and 30-day outbound sales velocities.
   - Calls Model 1 (Random Forest) and Model 2 (Gradient Boosting) for forward demand forecasting.
3. **Stock Alert Agent**:
   - Compares physical stock against dynamic safety stocks and reorder points.
   - Executes Model 3 (Stockout Risk Classifier) and Model 5 (Inventory Status Classifier).
   - Generates persistent operational alerts (CRITICAL, WARNING, INFO).
4. **Reorder Agent**:
   - Applies the validated business formula:  
     $$\text{Reorder Point} = (\text{Avg Daily Demand} \times \text{Lead Time}) + \text{Safety Stock}$$
   - Queries open purchase orders to deduct units already in the pipeline (preventing over-ordering).
   - Reconciles formula calculations with Model 4 (Reorder Quantity Regressor).
5. **Decision Agent**:
   - Arbitrates signals into an authoritative executive decision: `NO ACTION`, `MONITOR`, `REORDER SOON`, or `REORDER NOW`.
   - Records timestamped prediction records to SQLite and updates the live agent activity feed.

---

## 7. Dataset-Based Transaction Simulator

Implemented in [simulator.py](file:///d:/mini%20project%203/backend/simulator.py):

- **Strict Replay System**: Does not fabricate random transactions during simulation. Reads sequentially from `data/warehouse_transactions.csv` sorted by date.
- **Controls**: `START`, `PAUSE`, `RESUME`, `STOP`, and configurable speed delays (1s, 2s, 5s, 10s).
- **Execution Loop**:
  ```text
  CSV Record -> MultiAgentSystem -> Database Update -> Real-time WebSocket Broadcast -> React UI Update
  ```

---

## 8. Installation & Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Generate Synthetic Dataset
Produces 54 products, 8 categories, 8 suppliers, 8 locations, and 12,500 transactions:
```bash
python generate_dataset.py
```

### Step 3: Train the 5 Machine Learning Models
Preprocesses features, splits chronologically, trains all 5 models, and outputs metrics:
```bash
python train.py
```

### Step 4: Launch the Unified Server (Backend + Frontend)
The frontend is pre-bundled into a zero-dependency package directly served by FastAPI (no `node_modules` or `npm install` needed!):
```bash
python -m uvicorn backend.main:app --port 8001
```
* **Dashboard & UI**: Open your browser at [http://localhost:8001/](http://localhost:8001/)
* **API Swagger Docs**: Available at [http://localhost:8001/docs](http://localhost:8001/docs)

*(Optional) If you want to run Vite dev server for frontend hot-reload during development:*
```bash
cd frontend
npm install
npm run dev
```

---

## 9. Demonstration Walkthrough (Viva / Evaluation Flow)

1. **Dashboard Overview**: Open [http://localhost:8001](http://localhost:8001). Observe the live KPI cards, AI reorder banner, and 7 interactive charts.
2. **Examine Catalog**: Click **Items & Catalog** to search and filter products by category, supplier, and stock status. Click any product to open the Item Detail modal.
3. **Inspect Multi-Agent Architecture**: Click **AI Agent Monitor** to observe all 5 agents (Inventory, Demand, Stock Alert, Reorder, Decision) running with live action logs.
4. **Start Transaction Simulator**:
   - In the top simulation bar, click **START SIMULATION**.
   - Watch the live progress bar, simulated date, and live transaction ticker.
   - Observe how stock numbers change, charts update, alerts fire, and agents arbitrate actions in real time without refreshing the page!
5. **Generate AI Reorder Plan**:
   - Click **AI Reorder Plan** in the navbar or dashboard banner.
   - Review the Executive Summary, Grouped Critical/High/Medium items, Supplier Consolidation, and Budget Trade-offs.
   - Click **Create Draft Purchase Orders** to automatically generate supplier-grouped POs in SQLite.
6. **Fulfill a Purchase Order**:
   - Navigate to **Purchase Orders**.
   - Locate the newly created PO and click **Receive Goods**.
   - Input the delivery quantity. Confirm receipt and watch inventory replenish and the AI state recalculate!

---

## 10. API Reference Summary

- `GET /dashboard`: Aggregated summary KPIs and 7 chart datasets.
- `GET /products`: Filterable product catalog with current stock and latest AI predictions.
- `GET /products/{id}`: Detailed product intelligence with location breakdowns and transaction logs.
- `POST /transactions`: Generic multi-agent transaction executor.
- `POST /stock/receive`, `issue`, `adjust`, `transfer`, `return`: Validated manual inventory movement endpoints.
- `GET /purchase-orders`, `POST /purchase-orders`: PO creation and status management.
- `POST /purchase-orders/{id}/receive`: Goods inward fulfillment.
- `GET /reorder-queue`: Prioritized queue of items requiring reorder.
- `POST /ai/reorder-plan`: Structured AI Reorder Plan generator with budget trade-off analysis.
- `POST /ai/reorder-plan/create-pos`: Automated PO conversion.
- `GET /agents/status`: Real-time state and action telemetry for all 5 agents.
- `POST /simulation/start`, `pause`, `resume`, `stop`, `speed`: Transaction simulator control endpoints.
- `WS /ws`: Real-time streaming WebSocket endpoint.

---

## 11. Project Limitations & Future Enhancements

- **Current Scope**: Optimized for single-node local execution using SQLite and local Python processes.
- **Future Enhancements**:
  - Integration with RFID/Barcode hardware scanners via Web Serial API.
  - Multi-tenant cloud deployment on Kubernetes with PostgreSQL and Redis message brokers.
  - LLM natural language querying ("Which supplier had the longest delay last quarter?").

---

