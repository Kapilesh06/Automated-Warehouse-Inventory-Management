"""
ml/train_models.py
Trains the 5 required Machine Learning models for the Warehouse Inventory Management System:
1. Demand Model (Random Forest Regressor)
2. Short-Term Demand Model (Gradient Boosting Regressor)
3. Stockout Risk Model (Random Forest Classifier)
4. Reorder Quantity Model (Random Forest Regressor)
5. Inventory Status Model (Decision Tree Classifier)
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from ml.preprocess import load_raw_data, engineer_features, split_train_test

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Define feature sets for each model
FEATURES_DEMAND = [
    "product_id", "category_id", "supplier_id", "unit_cost", "selling_price",
    "rolling_7d_demand", "rolling_14d_demand", "rolling_30d_demand",
    "velocity_3d", "day_of_week", "month", "is_weekend", "lead_time_days"
]

FEATURES_SHORT_TERM = [
    "product_id", "category_id", "unit_cost",
    "rolling_7d_demand", "rolling_14d_demand", "velocity_3d",
    "day_of_week", "month", "is_weekend"
]

FEATURES_STOCKOUT = [
    "product_id", "current_stock", "safety_stock", "reorder_point",
    "stock_ratio", "stock_to_safety_ratio", "velocity_3d",
    "rolling_7d_demand", "lead_time_days"
]

FEATURES_REORDER = [
    "current_stock", "rolling_30d_demand", "rolling_7d_demand",
    "reorder_point", "safety_stock", "lead_time_days",
    "velocity_3d", "open_po_qty", "unit_cost"
]

FEATURES_INVENTORY_STATUS = [
    "current_stock", "safety_stock", "reorder_point",
    "stock_ratio", "stock_to_safety_ratio", "velocity_3d", "rolling_7d_demand"
]

def train_all_models():
    print("=" * 70)
    print("AI MODEL TRAINING PIPELINE")
    print("=" * 70)
    
    # 1. Load raw data and engineer features
    print("[1/6] Loading data and engineering features...")
    df_tx, df_prod = load_raw_data()
    df_features = engineer_features(df_tx, df_prod)
    df_features["open_po_qty"] = 0.0  # historical baseline open PO
    print(f"      Engineered {len(df_features)} daily observation records across {len(df_prod)} SKUs.")
    
    # 2. Chronological Train-Test Split
    print("[2/6] Performing chronological train/test split...")
    train_df, test_df = split_train_test(df_features, test_ratio=0.2)
    print(f"      Train samples: {len(train_df)} | Test samples: {len(test_df)}")
    
    metrics = {
        "training_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_samples": len(df_features),
        "train_samples": len(train_df),
        "test_samples": len(test_df),
        "models": {}
    }
    
    # -------------------------------------------------------------
    # MODEL 1: Demand Prediction (Random Forest Regressor)
    # -------------------------------------------------------------
    print("[3/6] Training Model 1: Demand Prediction (Random Forest Regressor)...")
    X_train_d = train_df[FEATURES_DEMAND]
    y_train_d = train_df["target_30d_demand"]
    X_test_d = test_df[FEATURES_DEMAND]
    y_test_d = test_df["target_30d_demand"]
    
    demand_model = RandomForestRegressor(n_estimators=100, max_depth=14, random_state=42, n_jobs=-1)
    demand_model.fit(X_train_d, y_train_d)
    preds_d = demand_model.predict(X_test_d)
    
    mae_d = float(mean_absolute_error(y_test_d, preds_d))
    rmse_d = float(np.sqrt(mean_squared_error(y_test_d, preds_d)))
    r2_d = float(r2_score(y_test_d, preds_d))
    
    joblib.dump({"model": demand_model, "features": FEATURES_DEMAND}, os.path.join(MODELS_DIR, "demand_model.pkl"))
    metrics["models"]["demand_model"] = {
        "type": "Random Forest Regressor",
        "target": "target_30d_demand",
        "features": FEATURES_DEMAND,
        "metrics": {"MAE": round(mae_d, 3), "RMSE": round(rmse_d, 3), "R2": round(r2_d, 4)}
    }
    print(f"      Model 1 Results -> MAE: {mae_d:.2f} | RMSE: {rmse_d:.2f} | R²: {r2_d:.4f}")
    
    # -------------------------------------------------------------
    # MODEL 2: Short-Term Demand (Gradient Boosting Regressor)
    # -------------------------------------------------------------
    print("[4/6] Training Model 2: Short-Term Demand (Gradient Boosting Regressor)...")
    X_train_st = train_df[FEATURES_SHORT_TERM]
    y_train_st = train_df["target_7d_demand"]
    X_test_st = test_df[FEATURES_SHORT_TERM]
    y_test_st = test_df["target_7d_demand"]
    
    st_demand_model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=5, random_state=42)
    st_demand_model.fit(X_train_st, y_train_st)
    preds_st = st_demand_model.predict(X_test_st)
    
    mae_st = float(mean_absolute_error(y_test_st, preds_st))
    rmse_st = float(np.sqrt(mean_squared_error(y_test_st, preds_st)))
    r2_st = float(r2_score(y_test_st, preds_st))
    
    joblib.dump({"model": st_demand_model, "features": FEATURES_SHORT_TERM}, os.path.join(MODELS_DIR, "short_term_demand_model.pkl"))
    metrics["models"]["short_term_demand_model"] = {
        "type": "Gradient Boosting Regressor",
        "target": "target_7d_demand",
        "features": FEATURES_SHORT_TERM,
        "metrics": {"MAE": round(mae_st, 3), "RMSE": round(rmse_st, 3), "R2": round(r2_st, 4)}
    }
    print(f"      Model 2 Results -> MAE: {mae_st:.2f} | RMSE: {rmse_st:.2f} | R²: {r2_st:.4f}")
    
    # -------------------------------------------------------------
    # MODEL 3: Stockout Risk (Random Forest Classifier)
    # -------------------------------------------------------------
    print("[5/6] Training Model 3: Stockout Risk (Random Forest Classifier)...")
    X_train_so = train_df[FEATURES_STOCKOUT]
    y_train_so = train_df["target_stockout_risk"]
    X_test_so = test_df[FEATURES_STOCKOUT]
    y_test_so = test_df["target_stockout_risk"]
    
    stockout_model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    stockout_model.fit(X_train_so, y_train_so)
    preds_so = stockout_model.predict(X_test_so)
    
    acc_so = float(accuracy_score(y_test_so, preds_so))
    prec_so = float(precision_score(y_test_so, preds_so, average="weighted", zero_division=0))
    rec_so = float(recall_score(y_test_so, preds_so, average="weighted", zero_division=0))
    f1_so = float(f1_score(y_test_so, preds_so, average="weighted", zero_division=0))
    
    joblib.dump({"model": stockout_model, "features": FEATURES_STOCKOUT, "classes": list(stockout_model.classes_)}, os.path.join(MODELS_DIR, "stockout_model.pkl"))
    metrics["models"]["stockout_model"] = {
        "type": "Random Forest Classifier",
        "target": "target_stockout_risk (LOW, MEDIUM, HIGH)",
        "features": FEATURES_STOCKOUT,
        "classes": list(stockout_model.classes_),
        "metrics": {"Accuracy": round(acc_so, 4), "Precision": round(prec_so, 4), "Recall": round(rec_so, 4), "F1": round(f1_so, 4)}
    }
    print(f"      Model 3 Results -> Accuracy: {acc_so:.4f} | Precision: {prec_so:.4f} | Recall: {rec_so:.4f} | F1: {f1_so:.4f}")
    
    # -------------------------------------------------------------
    # MODEL 4: Reorder Quantity (Random Forest Regressor)
    # -------------------------------------------------------------
    print("[6a/6] Training Model 4: Reorder Quantity (Random Forest Regressor)...")
    X_train_rq = train_df[FEATURES_REORDER]
    y_train_rq = train_df["target_reorder_qty"]
    X_test_rq = test_df[FEATURES_REORDER]
    y_test_rq = test_df["target_reorder_qty"]
    
    reorder_model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    reorder_model.fit(X_train_rq, y_train_rq)
    preds_rq = reorder_model.predict(X_test_rq)
    
    mae_rq = float(mean_absolute_error(y_test_rq, preds_rq))
    rmse_rq = float(np.sqrt(mean_squared_error(y_test_rq, preds_rq)))
    r2_rq = float(r2_score(y_test_rq, preds_rq))
    
    joblib.dump({"model": reorder_model, "features": FEATURES_REORDER}, os.path.join(MODELS_DIR, "reorder_model.pkl"))
    metrics["models"]["reorder_model"] = {
        "type": "Random Forest Regressor",
        "target": "target_reorder_qty",
        "features": FEATURES_REORDER,
        "metrics": {"MAE": round(mae_rq, 3), "RMSE": round(rmse_rq, 3), "R2": round(r2_rq, 4)}
    }
    print(f"      Model 4 Results -> MAE: {mae_rq:.2f} | RMSE: {rmse_rq:.2f} | R²: {r2_rq:.4f}")
    
    # -------------------------------------------------------------
    # MODEL 5: Inventory Status (Decision Tree Classifier)
    # -------------------------------------------------------------
    print("[6b/6] Training Model 5: Inventory Status (Decision Tree Classifier)...")
    X_train_is = train_df[FEATURES_INVENTORY_STATUS]
    y_train_is = train_df["target_inventory_status"]
    X_test_is = test_df[FEATURES_INVENTORY_STATUS]
    y_test_is = test_df["target_inventory_status"]
    
    inv_status_model = DecisionTreeClassifier(max_depth=6, random_state=42)
    inv_status_model.fit(X_train_is, y_train_is)
    preds_is = inv_status_model.predict(X_test_is)
    
    acc_is = float(accuracy_score(y_test_is, preds_is))
    prec_is = float(precision_score(y_test_is, preds_is, average="weighted", zero_division=0))
    rec_is = float(recall_score(y_test_is, preds_is, average="weighted", zero_division=0))
    f1_is = float(f1_score(y_test_is, preds_is, average="weighted", zero_division=0))
    
    joblib.dump({"model": inv_status_model, "features": FEATURES_INVENTORY_STATUS, "classes": list(inv_status_model.classes_)}, os.path.join(MODELS_DIR, "inventory_status_model.pkl"))
    metrics["models"]["inventory_status_model"] = {
        "type": "Decision Tree Classifier",
        "target": "target_inventory_status (OVERSTOCK, NORMAL, LOW, CRITICAL)",
        "features": FEATURES_INVENTORY_STATUS,
        "classes": list(inv_status_model.classes_),
        "metrics": {"Accuracy": round(acc_is, 4), "Precision": round(prec_is, 4), "Recall": round(rec_is, 4), "F1": round(f1_is, 4)}
    }
    print(f"      Model 5 Results -> Accuracy: {acc_is:.4f} | Precision: {prec_is:.4f} | Recall: {rec_is:.4f} | F1: {f1_is:.4f}")
    
    # Save all metrics
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"[+] All 5 models and metrics saved successfully to {MODELS_DIR}/")
    print("=" * 70)
    return metrics

if __name__ == "__main__":
    train_all_models()
