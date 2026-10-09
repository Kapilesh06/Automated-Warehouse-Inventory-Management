"""
ml/preprocess.py
Feature Engineering and Dataset Preprocessing for Warehouse Inventory ML System.
Ensures strict chronological ordering and prevents future data leakage.
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

def load_raw_data():
    """Load transaction and product datasets."""
    tx_path = os.path.join(DATA_DIR, "warehouse_transactions.csv")
    prod_path = os.path.join(DATA_DIR, "products.csv")
    
    if not os.path.exists(tx_path) or not os.path.exists(prod_path):
        raise FileNotFoundError("Dataset files not found in data/. Run generate_dataset.py first.")
        
    df_tx = pd.read_csv(tx_path)
    df_prod = pd.read_csv(prod_path)
    
    df_tx["date"] = pd.to_datetime(df_tx["date"])
    df_tx = df_tx.sort_values(by="date").reset_index(drop=True)
    return df_tx, df_prod

def engineer_features(df_tx, df_prod):
    """
    Construct rich, leak-free features for the 5 ML models:
    1. Demand Model (30-day demand)
    2. Short-term Demand Model (7-day demand)
    3. Stockout Risk Model (LOW, MEDIUM, HIGH)
    4. Reorder Quantity Model (recommended quantity)
    5. Inventory Status Model (OVERSTOCK, NORMAL, LOW, CRITICAL)
    """
    # Create daily product-level aggregation
    df_tx["date_only"] = df_tx["date"].dt.date
    
    # Calculate daily outbound demand (ISSUE)
    df_issues = df_tx[df_tx["transaction_type"] == "ISSUE"].copy()
    daily_demand = df_issues.groupby(["date_only", "product_id"])["quantity"].sum().reset_index()
    daily_demand.rename(columns={"quantity": "daily_sold"}, inplace=True)
    
    # Merge with full calendar dates for each product to ensure continuous time series
    all_dates = pd.date_range(start=df_tx["date"].min().date(), end=df_tx["date"].max().date(), freq="D").date
    all_products = df_prod["id"].unique()
    grid = pd.MultiIndex.from_product([all_dates, all_products], names=["date_only", "product_id"]).to_frame().reset_index(drop=True)
    
    ts_data = pd.merge(grid, daily_demand, on=["date_only", "product_id"], how="left")
    ts_data["daily_sold"] = ts_data["daily_sold"].fillna(0)
    ts_data["date"] = pd.to_datetime(ts_data["date_only"])
    ts_data = ts_data.sort_values(by=["product_id", "date"]).reset_index(drop=True)
    
    # Engineer rolling features (strictly lagged so current day does not leak forward)
    # Rolling 7-day, 14-day, 30-day historical averages
    grouped = ts_data.groupby("product_id")["daily_sold"]
    ts_data["rolling_7d_demand"] = grouped.transform(lambda x: x.shift(1).rolling(window=7, min_periods=1).mean()).fillna(0)
    ts_data["rolling_14d_demand"] = grouped.transform(lambda x: x.shift(1).rolling(window=14, min_periods=1).mean()).fillna(0)
    ts_data["rolling_30d_demand"] = grouped.transform(lambda x: x.shift(1).rolling(window=30, min_periods=1).mean()).fillna(0)
    ts_data["velocity_3d"] = grouped.transform(lambda x: x.shift(1).rolling(window=3, min_periods=1).sum() / 3.0).fillna(0)
    
    # Target 1: Forward 30-day demand (future sum of daily sold)
    ts_data["target_30d_demand"] = grouped.transform(lambda x: x.iloc[::-1].rolling(window=30, min_periods=1).sum().iloc[::-1].shift(-1))
    
    # Target 2: Forward 7-day demand (short term demand)
    ts_data["target_7d_demand"] = grouped.transform(lambda x: x.iloc[::-1].rolling(window=7, min_periods=1).sum().iloc[::-1].shift(-1))
    
    # Drop rows where future targets cannot be computed (end of time series)
    ts_data = ts_data.dropna(subset=["target_30d_demand", "target_7d_demand"]).copy()
    
    # Add calendar features
    ts_data["day_of_week"] = ts_data["date"].dt.dayofweek
    ts_data["month"] = ts_data["date"].dt.month
    ts_data["is_weekend"] = ts_data["day_of_week"].apply(lambda d: 1 if d in [5, 6] else 0)
    
    # Merge product metadata
    prod_meta = df_prod[["id", "unit_cost", "selling_price", "reorder_point", "reorder_quantity", "lead_time_days", "safety_stock", "category_id", "supplier_id"]].copy()
    prod_meta.rename(columns={"id": "product_id"}, inplace=True)
    df_merged = pd.merge(ts_data, prod_meta, on="product_id", how="left")
    
    # Merge latest simulated stock before/on that date for each product
    # To simulate inventory state dynamically across the timeline
    daily_tx_stock = df_tx.groupby(["date_only", "product_id"])["current_stock"].last().reset_index()
    df_merged = pd.merge(df_merged, daily_tx_stock, on=["date_only", "product_id"], how="left")
    # Forward-fill stock per product, then backward-fill
    df_merged["current_stock"] = df_merged.groupby("product_id")["current_stock"].ffill().bfill()
    df_merged["current_stock"] = df_merged["current_stock"].fillna(df_merged["reorder_point"] * 1.5)
    
    # Feature: Stock to Reorder ratio
    df_merged["stock_ratio"] = df_merged["current_stock"] / np.maximum(df_merged["reorder_point"], 1)
    df_merged["stock_to_safety_ratio"] = df_merged["current_stock"] / np.maximum(df_merged["safety_stock"], 1)
    
    # Target 3: Stockout Risk Classification (LOW, MEDIUM, HIGH)
    # Grounded on whether current_stock is sufficient for forward 7d demand + lead time demand
    lead_time_demand = (df_merged["target_7d_demand"] / 7.0) * df_merged["lead_time_days"]
    stock_cushion = df_merged["current_stock"] - lead_time_demand
    
    def label_stockout_risk(row):
        ratio = row["stock_ratio"]
        cushion = row["current_stock"] - ((row["target_7d_demand"] / 7.0) * row["lead_time_days"])
        if cushion <= row["safety_stock"] * 0.3 or ratio < 0.6:
            return "HIGH"
        elif cushion <= row["safety_stock"] * 1.0 or ratio < 1.0:
            return "MEDIUM"
        else:
            return "LOW"
            
    df_merged["target_stockout_risk"] = df_merged.apply(label_stockout_risk, axis=1)
    
    # Target 4: Recommended Reorder Quantity (Regression)
    # Business logic target grounded on future demand, lead time, open orders (simulated 0 or partial), and safety buffer
    # Reorder Quantity = max(0, (Daily Demand * Lead Time) + Safety Stock - Current Stock + (Target 30d demand * 0.75))
    expected_depletion = (df_merged["target_7d_demand"] / 7.0) * df_merged["lead_time_days"]
    deficit = (expected_depletion + df_merged["safety_stock"]) - df_merged["current_stock"]
    
    df_merged["target_reorder_qty"] = np.maximum(
        0,
        np.where(
            df_merged["target_stockout_risk"].isin(["HIGH", "MEDIUM"]),
            np.round(np.maximum(df_merged["reorder_quantity"], deficit + df_merged["target_30d_demand"] * 0.5)),
            0
        )
    )
    
    # Target 5: Inventory Status Classification (OVERSTOCK, NORMAL, LOW, CRITICAL)
    def label_inventory_status(row):
        if row["current_stock"] <= row["safety_stock"] * 0.5:
            return "CRITICAL"
        elif row["current_stock"] <= row["reorder_point"]:
            return "LOW"
        elif row["current_stock"] > row["reorder_point"] * 3.0:
            return "OVERSTOCK"
        else:
            return "NORMAL"
            
    df_merged["target_inventory_status"] = df_merged.apply(label_inventory_status, axis=1)
    
    return df_merged

def split_train_test(df_features, test_ratio=0.2):
    """
    Split data strictly chronologically by date to prevent look-ahead bias.
    """
    dates = np.sort(df_features["date"].unique())
    split_idx = int(len(dates) * (1 - test_ratio))
    split_date = dates[split_idx]
    
    train_df = df_features[df_features["date"] < split_date].copy()
    test_df = df_features[df_features["date"] >= split_date].copy()
    
    return train_df, test_df
