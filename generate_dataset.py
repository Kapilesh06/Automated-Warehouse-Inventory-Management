"""
generate_dataset.py
Synthetic Warehouse Dataset Generator
Produces realistic warehouse catalog, suppliers, locations, categories, and 12,000+ transactions
with non-random, realistic temporal and velocity patterns for ML training and simulation.
"""

import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Set deterministic seed for reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. CATEGORIES (8 Categories)
# -------------------------------------------------------------
CATEGORIES = [
    {"id": 1, "name": "Electronics", "description": "High-value digital hardware, peripherals, and storage components."},
    {"id": 2, "name": "Office Supplies", "description": "Stationery, presentation tools, desk organizers, and writing instruments."},
    {"id": 3, "name": "Packaging", "description": "Cartons, protective bubble wrap, adhesives, and strapping supplies."},
    {"id": 4, "name": "Tools", "description": "Hand tools, precision diagnostic sets, power tools, and maintenance gear."},
    {"id": 5, "name": "Spare Parts", "description": "Conveyor rollers, bearing packs, pneumatic fittings, and motor couplings."},
    {"id": 6, "name": "Retail Products", "description": "Consumer electronics accessories, lifestyle tech, and fast-moving retail items."},
    {"id": 7, "name": "Consumables", "description": "Printer inks, industrial lubricants, sanitizers, and thermal paper rolls."},
    {"id": 8, "name": "Furniture", "description": "Ergonomic executive chairs, heavy-duty shelving, standing desks, and file cabinets."}
]

# -------------------------------------------------------------
# 2. SUPPLIERS (8 Suppliers)
# -------------------------------------------------------------
SUPPLIERS = [
    {
        "id": 1,
        "supplier_code": "SUP-APEX",
        "name": "Apex Electronics Corp",
        "contact_person": "Vikram Malhotra",
        "email": "v.malhotra@apexelectronics.com",
        "phone": "+91 98201 12345",
        "address": "Electronic City Phase 1, Bangalore, Karnataka",
        "lead_time_days": 5,
        "minimum_order_amount": 50000.0,
        "reliability_rating": 0.96
    },
    {
        "id": 2,
        "supplier_code": "SUP-GLOPACK",
        "name": "Global Packaging Solutions",
        "contact_person": "Pooja Sharma",
        "email": "orders@glopack.in",
        "phone": "+91 97110 54321",
        "address": "Bhiwandi Logistics Hub, Thane, Maharashtra",
        "lead_time_days": 3,
        "minimum_order_amount": 15000.0,
        "reliability_rating": 0.98
    },
    {
        "id": 3,
        "supplier_code": "SUP-INDUS",
        "name": "Indus Precision Tools Ltd",
        "contact_person": "Rajesh Nair",
        "email": "sales@industools.co.in",
        "phone": "+91 94470 98765",
        "address": "Peenya Industrial Area, Bangalore, Karnataka",
        "lead_time_days": 7,
        "minimum_order_amount": 25000.0,
        "reliability_rating": 0.92
    },
    {
        "id": 4,
        "supplier_code": "SUP-METRO",
        "name": "Metro Office & Stationery",
        "contact_person": "Ananya Sen",
        "email": "corporate@metrooffice.com",
        "phone": "+91 98300 23456",
        "address": "Salt Lake Sector V, Kolkata, West Bengal",
        "lead_time_days": 4,
        "minimum_order_amount": 10000.0,
        "reliability_rating": 0.94
    },
    {
        "id": 5,
        "supplier_code": "SUP-ZENITH",
        "name": "Zenith Mechanical Parts",
        "contact_person": "Amit Patel",
        "email": "support@zenithparts.com",
        "phone": "+91 98790 67890",
        "address": "GIDC Naroda, Ahmedabad, Gujarat",
        "lead_time_days": 10,
        "minimum_order_amount": 40000.0,
        "reliability_rating": 0.89
    },
    {
        "id": 6,
        "supplier_code": "SUP-PRIME",
        "name": "Prime Consumables India",
        "contact_person": "Deepak Verma",
        "email": "sales@primeconsumables.in",
        "phone": "+91 99100 45678",
        "address": "Okhla Industrial Area Phase III, New Delhi",
        "lead_time_days": 4,
        "minimum_order_amount": 20000.0,
        "reliability_rating": 0.95
    },
    {
        "id": 7,
        "supplier_code": "SUP-NEXUS",
        "name": "Nexus Retail Goods",
        "contact_person": "Kavita Reddy",
        "email": "procurement@nexusretail.com",
        "phone": "+91 98480 34567",
        "address": "HITEC City Madhapur, Hyderabad, Telangana",
        "lead_time_days": 6,
        "minimum_order_amount": 35000.0,
        "reliability_rating": 0.93
    },
    {
        "id": 8,
        "supplier_code": "SUP-VANGUARD",
        "name": "Vanguard Ergonomics & Furniture",
        "contact_person": "Sunil Rao",
        "email": "contracts@vanguardfurniture.com",
        "phone": "+91 98800 89012",
        "address": "Bommasandra Industrial Zone, Bangalore, Karnataka",
        "lead_time_days": 12,
        "minimum_order_amount": 60000.0,
        "reliability_rating": 0.91
    }
]

# -------------------------------------------------------------
# 3. LOCATIONS (8 Locations)
# -------------------------------------------------------------
LOCATIONS = [
    {"id": 1, "name": "Main Central Warehouse", "code": "WH-MAIN", "type": "PRIMARY", "address": "Bay 1-12, Central Logistics Park, Sector 18, Gurgaon"},
    {"id": 2, "name": "North Distribution Center", "code": "DC-NORTH", "type": "DISTRIBUTION", "address": "GT Road, Kundli Logistic Hub, Sonipat"},
    {"id": 3, "name": "West Coast Fulfillment Center", "code": "FC-WEST", "type": "FULFILLMENT", "address": "Bhiwandi Express Highway, Thane"},
    {"id": 4, "name": "South Regional Depot", "code": "RD-SOUTH", "type": "DEPOT", "address": "Hosur Road Logistics Corridor, Bangalore"},
    {"id": 5, "name": "East Fast-Hub", "code": "HUB-EAST", "type": "CROSS_DOCK", "address": "Dankuni Express Cargo Terminal, Hooghly"},
    {"id": 6, "name": "Secured Electronics Vault", "code": "SEC-VAULT", "type": "SECURE_STORAGE", "address": "Cleanroom Unit 4, Central Logistics Park, Gurgaon"},
    {"id": 7, "name": "Bulk Overflow Yard", "code": "OY-BULK", "type": "OVERFLOW", "address": "Open Shed 2B, Pataudi Road Warehouse Park, Gurgaon"},
    {"id": 8, "name": "Assembly & Prep Bay", "code": "BAY-PREP", "type": "STAGING", "address": "Dock 7 Marshalling Area, Central Logistics Park, Gurgaon"}
]

# -------------------------------------------------------------
# 4. PRODUCTS (54 Distinct Products across all 8 Categories)
# -------------------------------------------------------------
# Definition tuples: (name, category_id, supplier_id, unit, unit_cost, markup, demand_weight, lead_time, safety_stock)
RAW_PRODUCTS = [
    # Electronics (Category 1, Supplier 1)
    ("Enterprise Laptop 15-inch", 1, 1, "Units", 48000.0, 1.25, "HIGH", 5, 20),
    ("Wireless Ergonomic Mouse", 1, 1, "Units", 850.0, 1.45, "HIGH", 5, 60),
    ("Mechanical Gaming Keyboard", 1, 1, "Units", 2400.0, 1.40, "HIGH", 5, 45),
    ("UltraSharp 27-inch 4K Monitor", 1, 1, "Units", 22000.0, 1.25, "MEDIUM", 5, 15),
    ("Laser Multifunction Network Printer", 1, 1, "Units", 18500.0, 1.30, "MEDIUM", 6, 12),
    ("1080p HD Streaming Webcam", 1, 1, "Units", 1950.0, 1.45, "HIGH", 4, 40),
    ("Braided USB-C to USB-C Cable 2M", 1, 1, "Units", 180.0, 1.80, "HIGH", 3, 100),
    ("NVMe M.2 1TB Solid State Drive", 1, 1, "Units", 5200.0, 1.30, "HIGH", 5, 35),
    ("DDR4 16GB 3200MHz RAM Module", 1, 1, "Units", 2800.0, 1.35, "HIGH", 5, 40),
    ("Dual-Band Gigabit Wi-Fi 6 Router", 1, 1, "Units", 3400.0, 1.35, "MEDIUM", 5, 25),
    ("Active Noise Cancelling Headphones", 1, 1, "Units", 4500.0, 1.40, "MEDIUM", 6, 30),
    ("GaN 65W Multi-Port Fast Charger", 1, 1, "Units", 1100.0, 1.50, "HIGH", 4, 50),

    # Office Supplies (Category 2, Supplier 4)
    ("Heavy Duty Desk Stapler", 2, 4, "Units", 220.0, 1.50, "MEDIUM", 4, 30),
    ("A4 Multipurpose Copy Paper 80GSM (Ream)", 2, 4, "Reams", 240.0, 1.35, "HIGH", 3, 120),
    ("Gel Ink Retractable Pens (Pack of 12)", 2, 4, "Packs", 150.0, 1.60, "HIGH", 4, 80),
    ("Adhesive Sticky Notes 3x3 (12 Pack)", 2, 4, "Packs", 180.0, 1.55, "HIGH", 4, 70),
    ("Magnetic Whiteboard 4x3 Ft", 2, 4, "Units", 1450.0, 1.40, "LOW", 5, 15),
    ("Dry Erase Markers Assorted (Set of 8)", 2, 4, "Sets", 160.0, 1.60, "HIGH", 4, 50),
    ("Expanding Document File Organizer", 2, 4, "Units", 320.0, 1.50, "MEDIUM", 4, 40),

    # Packaging (Category 3, Supplier 2)
    ("Corrugated Shipping Box 12x10x8", 3, 2, "Bundles", 350.0, 1.40, "HIGH", 3, 150),
    ("Heavy Duty Corrugated Box 18x14x12", 3, 2, "Bundles", 550.0, 1.40, "HIGH", 3, 120),
    ("Heavy Duty Packaging Tape 3-inch (6 Rolls)", 3, 2, "Packs", 280.0, 1.50, "HIGH", 3, 140),
    ("Perforated Bubble Cushioning Wrap 100M", 3, 2, "Rolls", 680.0, 1.45, "HIGH", 3, 50),
    ("Stretch Film Pallet Wrap 23 Micron", 3, 2, "Rolls", 480.0, 1.40, "HIGH", 3, 60),
    ("Air Pillow Cushion Bags (1000 Count)", 3, 2, "Boxes", 850.0, 1.40, "MEDIUM", 4, 40),
    ("Thermal Shipping Labels 4x6 (1000 Roll)", 3, 2, "Rolls", 310.0, 1.50, "HIGH", 3, 100),

    # Tools (Category 4, Supplier 3)
    ("68-Piece Precision Screwdriver Set", 4, 3, "Kits", 850.0, 1.45, "MEDIUM", 7, 35),
    ("Cordless Impact Drill 18V Kit", 4, 3, "Kits", 4800.0, 1.35, "MEDIUM", 7, 20),
    ("Digital Caliper 150mm Stainless", 4, 3, "Units", 1200.0, 1.45, "LOW", 7, 15),
    ("Industrial Retractable Utility Knife (10-Pk)", 4, 3, "Packs", 350.0, 1.50, "HIGH", 5, 50),
    ("Digital Infrared Laser Thermometer", 4, 3, "Units", 1650.0, 1.40, "LOW", 7, 15),
    ("Locking Pliers & Wrench Combination Set", 4, 3, "Sets", 980.0, 1.45, "MEDIUM", 7, 25),

    # Spare Parts (Category 5, Supplier 5)
    ("Industrial Conveyor Roller 50mm", 5, 5, "Units", 420.0, 1.40, "MEDIUM", 10, 30),
    ("Deep Groove Ball Bearing 6205-2RS (10 Pk)", 5, 5, "Packs", 650.0, 1.45, "MEDIUM", 10, 40),
    ("Poly-V Drive Transmission Belt 1200mm", 5, 5, "Units", 380.0, 1.45, "MEDIUM", 10, 25),
    ("Pneumatic Quick-Connect Fitting 8mm (20 Pk)", 5, 5, "Packs", 490.0, 1.50, "MEDIUM", 9, 35),
    ("Heavy-Duty Swivel Caster Wheels 4-inch (4 Pk)", 5, 5, "Sets", 1100.0, 1.40, "LOW", 10, 20),
    ("Proximity Sensor Inductive 12mm", 5, 5, "Units", 750.0, 1.45, "LOW", 10, 20),

    # Retail Products (Category 6, Supplier 7)
    ("Portable Bluetooth Rugged Speaker", 6, 7, "Units", 1600.0, 1.50, "HIGH", 6, 45),
    ("20000mAh Dual USB Power Bank", 6, 7, "Units", 1250.0, 1.45, "HIGH", 6, 60),
    ("Water-Resistant Laptop Backpack 25L", 6, 7, "Units", 1400.0, 1.55, "HIGH", 6, 40),
    ("Smart LED Desk Lamp with Wireless Charging", 6, 7, "Units", 1850.0, 1.45, "MEDIUM", 6, 30),
    ("Wireless Fitness Tracker Band", 6, 7, "Units", 1750.0, 1.50, "MEDIUM", 6, 35),
    ("Ergonomic Aluminium Laptop Riser", 6, 7, "Units", 950.0, 1.55, "HIGH", 5, 50),

    # Consumables (Category 7, Supplier 6)
    ("Black High-Yield Toner Cartridge (TN-660)", 7, 6, "Units", 1950.0, 1.35, "HIGH", 4, 45),
    ("Cyan/Magenta/Yellow Ink Cartridge Pack", 7, 6, "Packs", 2400.0, 1.35, "MEDIUM", 4, 30),
    ("Multi-Surface Sanitizing Wipes (800 Wipes)", 7, 6, "Tubs", 450.0, 1.50, "HIGH", 4, 50),
    ("Industrial Anti-Corrosion Spray Lube 400ml", 7, 6, "Cans", 280.0, 1.55, "MEDIUM", 4, 40),
    ("Thermal Receipt Paper Roll 80mm (Box of 50)", 7, 6, "Boxes", 850.0, 1.40, "HIGH", 4, 60),
    ("Heavy-Duty Nitrile Gloves Size L (Box of 100)", 7, 6, "Boxes", 380.0, 1.50, "HIGH", 4, 80),

    # Furniture (Category 8, Supplier 8)
    ("Ergonomic Mesh High-Back Office Chair", 8, 8, "Units", 8500.0, 1.35, "MEDIUM", 12, 15),
    ("Motorized Dual-Motor Height Adjustable Desk", 8, 8, "Units", 24000.0, 1.30, "LOW", 14, 8),
    ("Heavy Duty Steel Storage Shelving Rack 5-Tier", 8, 8, "Units", 5800.0, 1.35, "LOW", 12, 12),
    ("Mobile 3-Drawer Steel File Pedestal", 8, 8, "Units", 4200.0, 1.40, "MEDIUM", 12, 16)
]

def generate_products():
    products = []
    base_time = datetime.now() - timedelta(days=220)
    for idx, (name, cat_id, sup_id, unit, unit_cost, markup, demand_weight, lead_time, safety_stock) in enumerate(RAW_PRODUCTS, 1):
        sku = f"SKU-{cat_id:02d}-{idx:03d}"
        barcode = f"890{cat_id:02d}{idx:04d}{random.randint(100, 999)}"
        selling_price = round(unit_cost * markup, 2)
        
        # Calculate realistic reorder parameters based on demand weight and lead time
        daily_rate = 5.0 if demand_weight == "HIGH" else (2.0 if demand_weight == "MEDIUM" else 0.8)
        reorder_point = int(round(daily_rate * lead_time + safety_stock))
        reorder_quantity = int(round(daily_rate * 21)) # roughly 3 weeks supply
        reorder_quantity = max(reorder_quantity, 10)
        
        products.append({
            "id": idx,
            "sku": sku,
            "barcode": barcode,
            "name": name,
            "category_id": cat_id,
            "supplier_id": sup_id,
            "unit": unit,
            "unit_cost": unit_cost,
            "selling_price": selling_price,
            "reorder_point": reorder_point,
            "reorder_quantity": reorder_quantity,
            "lead_time_days": lead_time,
            "safety_stock": safety_stock,
            "demand_weight": demand_weight,
            "created_at": (base_time + timedelta(days=random.randint(0, 10))).strftime("%Y-%m-%d %H:%M:%S")
        })
    return products

# -------------------------------------------------------------
# 5. TRANSACTIONS SIMULATION GENERATOR (12,000+ Records)
# -------------------------------------------------------------
def generate_transactions(products, suppliers, locations, target_count=12500):
    start_date = datetime.now() - timedelta(days=180)
    end_date = datetime.now()
    total_days = (end_date - start_date).days
    
    prod_map = {p["id"]: p for p in products}
    loc_ids = [l["id"] for l in locations]
    
    # Initialize inventory tracking state per product per location
    # Healthy initial distribution across locations
    inventory_state = {}
    for p in products:
        p_id = p["id"]
        inventory_state[p_id] = {}
        for l_id in loc_ids:
            if l_id == 1:  # Central warehouse holds highest stock
                init_qty = random.randint(p["reorder_point"] * 2, p["reorder_point"] * 4)
            elif l_id in [2, 3, 4]:  # Distribution centers hold moderate stock
                init_qty = random.randint(p["reorder_point"], p["reorder_point"] * 2)
            else:  # Specialty or overflow locations
                init_qty = random.randint(int(p["safety_stock"] * 0.5), p["safety_stock"] * 2)
            inventory_state[p_id][l_id] = init_qty
            
    transactions = []
    current_date = start_date
    tx_counter = 1
    
    # Pre-calculate daily transaction frequency targets (~70 transactions per day)
    avg_tx_per_day = target_count // total_days
    
    # Demand weights to probabilities
    weight_multipliers = {"HIGH": 3.5, "MEDIUM": 1.5, "LOW": 0.5}
    prod_weights = [weight_multipliers[p["demand_weight"]] for p in products]
    prod_probs = np.array(prod_weights) / sum(prod_weights)
    
    while current_date <= end_date and tx_counter <= target_count:
        day_of_week = current_date.weekday()
        month = current_date.month
        is_weekend = 1 if day_of_week in [5, 6] else 0
        
        # Real-world velocity factors:
        # Weekday factor (Mon-Thu active, Fri peak dispatch, Sat-Sun lower)
        dow_factor = 0.5 if is_weekend else (1.2 if day_of_week in [0, 4] else 1.0)
        # Month factor (Quarter-ends: March, June, Sept, Dec experience demand surge)
        month_factor = 1.35 if month in [3, 6, 9, 12] else 1.0
        # Random daily variation
        daily_noise = random.uniform(0.85, 1.25)
        
        num_transactions_today = int(avg_tx_per_day * dow_factor * month_factor * daily_noise)
        
        # Distribute transactions throughout operating hours (07:00 to 22:00)
        day_seconds = 15 * 3600
        sec_offsets = sorted([random.randint(0, day_seconds) for _ in range(num_transactions_today)])
        
        for sec_offset in sec_offsets:
            if tx_counter > target_count:
                break
                
            tx_time = current_date.replace(hour=7, minute=0, second=0) + timedelta(seconds=sec_offset)
            
            # Select product based on weighted realistic probability
            product = np.random.choice(products, p=prod_probs)
            p_id = product["id"]
            
            # Determine location for transaction
            # Distribution centers (1, 2, 3, 4) handle 85% of transactions
            if random.random() < 0.85:
                loc_id = random.choice([1, 2, 3, 4])
            else:
                loc_id = random.choice(loc_ids)
                
            curr_stock = inventory_state[p_id][loc_id]
            
            # Decide transaction type realistically:
            # If stock is critically below safety stock, chance of RECEIVE increases dramatically
            if curr_stock < product["safety_stock"]:
                tx_type_prob = {"RECEIVE": 0.55, "ISSUE": 0.25, "TRANSFER": 0.15, "ADJUST": 0.05, "RETURN": 0.0}
            elif curr_stock < product["reorder_point"]:
                tx_type_prob = {"RECEIVE": 0.35, "ISSUE": 0.45, "TRANSFER": 0.12, "ADJUST": 0.05, "RETURN": 0.03}
            else:
                tx_type_prob = {"RECEIVE": 0.18, "ISSUE": 0.64, "TRANSFER": 0.10, "ADJUST": 0.04, "RETURN": 0.04}
                
            tx_type = random.choices(
                list(tx_type_prob.keys()),
                weights=list(tx_type_prob.values()),
                k=1
            )[0]
            
            qty = 0
            reason = ""
            ref_num = ""
            note = ""
            src_loc = None
            dest_loc = None
            
            if tx_type == "ISSUE":
                # Sales / outbound shipment
                base_qty = random.randint(1, 4) if product["demand_weight"] == "LOW" else (
                    random.randint(2, 10) if product["demand_weight"] == "MEDIUM" else random.randint(3, 20)
                )
                # Occasional bulk corporate order spike
                if random.random() < 0.04:
                    base_qty = int(base_qty * random.uniform(2.5, 4.0))
                    
                # Guard against negative inventory unless recording an explicit stockout
                if curr_stock <= 0:
                    # Stockout encountered - log minimal stockout issue or skip
                    qty = 0
                    reason = "Out of Stock Event - Backorder Logged"
                    ref_num = f"SO-{tx_counter:06d}"
                    note = f"Customer order could not be fulfilled for {product['name']}. Current balance: 0."
                elif base_qty > curr_stock:
                    qty = curr_stock  # fulfill partial
                    curr_stock = 0
                    reason = "Partial Fulfillment due to Low Stock"
                    ref_num = f"ORD-PART-{tx_counter:06d}"
                    note = f"Dispatched remaining {qty} units. Product entered zero stock."
                else:
                    qty = base_qty
                    curr_stock -= qty
                    reason = random.choice(["Sales Order Fulfillment", "Wholesale Dispatch", "Branch Requisition", "E-commerce Outbound"])
                    ref_num = f"ORD-{tx_counter:06d}"
                    note = f"Standard outbound order fulfillment of {qty} {product['unit']}."
                src_loc = loc_id
                dest_loc = None
                
            elif tx_type == "RECEIVE":
                # Restock from supplier purchase order
                qty = product["reorder_quantity"] + random.randint(-5, 15)
                qty = max(qty, 5)
                curr_stock += qty
                reason = "Purchase Order Restock Receipt"
                ref_num = f"PO-{random.randint(1001, 1999)}"
                note = f"Received shipment from {SUPPLIERS[product['supplier_id']-1]['name']}."
                src_loc = None
                dest_loc = loc_id
                
            elif tx_type == "TRANSFER":
                # Inter-warehouse transfer
                other_locs = [l for l in loc_ids if l != loc_id]
                other_loc = random.choice(other_locs)
                
                # Transfer from higher stocked to lower stocked
                if inventory_state[p_id][other_loc] < inventory_state[p_id][loc_id]:
                    from_l, to_l = loc_id, other_loc
                else:
                    from_l, to_l = other_loc, loc_id
                    
                avail = inventory_state[p_id][from_l]
                qty = min(random.randint(5, 25), max(1, avail // 2))
                if qty > 0 and avail >= qty:
                    inventory_state[p_id][from_l] -= qty
                    inventory_state[p_id][to_l] += qty
                    src_loc = from_l
                    dest_loc = to_l
                    curr_stock = inventory_state[p_id][loc_id]
                    reason = "Inter-facility Stock Rebalance"
                    ref_num = f"TRF-{tx_counter:06d}"
                    note = f"Transferred {qty} units from Loc {from_l} to Loc {to_l} to prevent regional stockout."
                else:
                    continue  # skip invalid transfer attempt
                    
            elif tx_type == "ADJUST":
                # Physical inventory count discrepancy
                variance = random.choice([-3, -2, -1, 1, 2])
                new_stock = max(0, curr_stock + variance)
                qty = abs(new_stock - curr_stock)
                curr_stock = new_stock
                reason = "Cycle Count Reconciliation"
                ref_num = f"CC-{random.randint(100, 999)}"
                note = f"Variance of {variance} reconciled after physical inspection."
                src_loc = loc_id
                dest_loc = loc_id
                
            elif tx_type == "RETURN":
                # Customer / department return
                qty = random.randint(1, 4)
                curr_stock += qty
                reason = "Customer Return / RMA Inspection Passed"
                ref_num = f"RMA-{random.randint(5000, 9999)}"
                note = f"Returned {qty} units in unopened condition restored to active inventory."
                src_loc = None
                dest_loc = loc_id
                
            # Update active inventory tracking state
            inventory_state[p_id][loc_id] = curr_stock
            
            # Append detailed transaction
            tx_id_str = f"TXN-{tx_counter:06d}"
            transactions.append({
                "transaction_id": tx_id_str,
                "date": tx_time.strftime("%Y-%m-%d %H:%M:%S"),
                "product_id": p_id,
                "product_name": product["name"],
                "category": CATEGORIES[product["category_id"] - 1]["name"],
                "category_id": product["category_id"],
                "supplier_id": product["supplier_id"],
                "location_id": loc_id,
                "source_location": src_loc,
                "destination_location": dest_loc,
                "transaction_type": tx_type,
                "quantity": qty,
                "unit_cost": product["unit_cost"],
                "current_stock": curr_stock,
                "reorder_point": product["reorder_point"],
                "reorder_quantity": product["reorder_quantity"],
                "lead_time_days": product["lead_time_days"],
                "safety_stock": product["safety_stock"],
                "day_of_week": day_of_week,
                "month": month,
                "is_weekend": is_weekend,
                "reason": reason,
                "reference_number": ref_num,
                "note": note
            })
            tx_counter += 1
            
        current_date += timedelta(days=1)
        
    return transactions, inventory_state

def main():
    print("=" * 70)
    print("Generating Synthetic Warehouse Dataset...")
    print("=" * 70)
    
    # 1. Generate & save categories
    df_categories = pd.DataFrame(CATEGORIES)
    categories_path = os.path.join(DATA_DIR, "categories.csv")
    df_categories.to_csv(categories_path, index=False)
    print(f"[+] Saved {len(df_categories)} categories to {categories_path}")
    
    # 2. Generate & save suppliers
    df_suppliers = pd.DataFrame(SUPPLIERS)
    suppliers_path = os.path.join(DATA_DIR, "suppliers.csv")
    df_suppliers.to_csv(suppliers_path, index=False)
    print(f"[+] Saved {len(df_suppliers)} suppliers to {suppliers_path}")
    
    # 3. Generate & save locations
    df_locations = pd.DataFrame(LOCATIONS)
    locations_path = os.path.join(DATA_DIR, "locations.csv")
    df_locations.to_csv(locations_path, index=False)
    print(f"[+] Saved {len(df_locations)} locations to {locations_path}")
    
    # 4. Generate & save products
    products = generate_products()
    # Remove internal generator field for clean export
    products_export = [{k: v for k, v in p.items() if k != "demand_weight"} for p in products]
    df_products = pd.DataFrame(products_export)
    products_path = os.path.join(DATA_DIR, "products.csv")
    df_products.to_csv(products_path, index=False)
    print(f"[+] Saved {len(df_products)} products to {products_path}")
    
    # 5. Generate & save transactions
    transactions, final_inventory = generate_transactions(products, SUPPLIERS, LOCATIONS, target_count=12500)
    df_transactions = pd.DataFrame(transactions)
    # Sort strictly chronologically
    df_transactions["date_dt"] = pd.to_datetime(df_transactions["date"])
    df_transactions = df_transactions.sort_values(by="date_dt").reset_index(drop=True)
    df_transactions = df_transactions.drop(columns=["date_dt"])
    
    transactions_path = os.path.join(DATA_DIR, "warehouse_transactions.csv")
    df_transactions.to_csv(transactions_path, index=False)
    print(f"[+] Saved {len(df_transactions)} transactions to {transactions_path}")
    print(f"    - Date span: {df_transactions['date'].min()} to {df_transactions['date'].max()}")
    print(f"    - Transaction breakdown:")
    for t_type, count in df_transactions["transaction_type"].value_counts().items():
        print(f"      * {t_type:<10}: {count} records ({count/len(df_transactions)*100:.1f}%)")
    print("=" * 70)
    print("Synthetic dataset generation completed successfully!")
    print("=" * 70)

if __name__ == "__main__":
    main()
