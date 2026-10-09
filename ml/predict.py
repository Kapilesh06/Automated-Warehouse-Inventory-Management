"""
ml/predict.py
Centralized Prediction Service for the 5 AI Machine Learning Models.
Loads all 5 trained models in memory once and serves inference requests to agents.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

class MLPredictionService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLPredictionService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.models_loaded = False
        self.demand_model_info = None
        self.short_term_model_info = None
        self.stockout_model_info = None
        self.reorder_model_info = None
        self.inv_status_model_info = None
        self.load_models()

    def load_models(self):
        """Loads all saved models from disk into memory."""
        try:
            d_path = os.path.join(MODELS_DIR, "demand_model.pkl")
            st_path = os.path.join(MODELS_DIR, "short_term_demand_model.pkl")
            so_path = os.path.join(MODELS_DIR, "stockout_model.pkl")
            ro_path = os.path.join(MODELS_DIR, "reorder_model.pkl")
            is_path = os.path.join(MODELS_DIR, "inventory_status_model.pkl")

            if (os.path.exists(d_path) and os.path.exists(st_path) and
                os.path.exists(so_path) and os.path.exists(ro_path) and
                os.path.exists(is_path)):
                
                self.demand_model_info = joblib.load(d_path)
                self.short_term_model_info = joblib.load(st_path)
                self.stockout_model_info = joblib.load(so_path)
                self.reorder_model_info = joblib.load(ro_path)
                self.inv_status_model_info = joblib.load(is_path)
                self.models_loaded = True
                print("[ML Service] Successfully loaded all 5 AI models into memory.")
            else:
                print("[ML Service] Warning: Some or all model files are missing in models/. Run train.py first.")
                self.models_loaded = False
        except Exception as e:
            print(f"[ML Service] Error loading models: {e}")
            self.models_loaded = False

    def predict_demand(self, features_dict: Dict[str, Any]) -> float:
        """Predict forward 30-day demand using Random Forest Regressor."""
        if not self.models_loaded or not self.demand_model_info:
            # Fallback heuristic if model uninitialized
            return float(max(10, features_dict.get("rolling_7d_demand", 2.0) * 30))
        
        cols = self.demand_model_info["features"]
        df_in = pd.DataFrame([{col: features_dict.get(col, 0) for col in cols}])
        pred = self.demand_model_info["model"].predict(df_in)[0]
        return float(max(0.0, round(pred, 2)))

    def predict_short_term_demand(self, features_dict: Dict[str, Any]) -> float:
        """Predict forward 7-day demand using Gradient Boosting Regressor."""
        if not self.models_loaded or not self.short_term_model_info:
            return float(max(2, features_dict.get("rolling_7d_demand", 2.0) * 7))

        cols = self.short_term_model_info["features"]
        df_in = pd.DataFrame([{col: features_dict.get(col, 0) for col in cols}])
        pred = self.short_term_model_info["model"].predict(df_in)[0]
        return float(max(0.0, round(pred, 2)))

    def predict_stockout_risk(self, features_dict: Dict[str, Any]) -> str:
        """Predict Stockout Risk (LOW, MEDIUM, HIGH) using Random Forest Classifier."""
        if not self.models_loaded or not self.stockout_model_info:
            # Safe heuristic
            curr = features_dict.get("current_stock", 100)
            rop = features_dict.get("reorder_point", 20)
            if curr <= rop * 0.5:
                return "HIGH"
            elif curr <= rop:
                return "MEDIUM"
            return "LOW"

        cols = self.stockout_model_info["features"]
        df_in = pd.DataFrame([{col: features_dict.get(col, 0) for col in cols}])
        pred = self.stockout_model_info["model"].predict(df_in)[0]
        return str(pred)

    def predict_reorder_quantity(self, features_dict: Dict[str, Any]) -> int:
        """Predict Recommended Reorder Quantity using Random Forest Regressor."""
        if not self.models_loaded or not self.reorder_model_info:
            return int(features_dict.get("reorder_quantity", 50))

        cols = self.reorder_model_info["features"]
        df_in = pd.DataFrame([{col: features_dict.get(col, 0) for col in cols}])
        pred = self.reorder_model_info["model"].predict(df_in)[0]
        return int(max(0, round(pred)))

    def predict_inventory_status(self, features_dict: Dict[str, Any]) -> str:
        """Predict Inventory Status (OVERSTOCK, NORMAL, LOW, CRITICAL) using Decision Tree Classifier."""
        if not self.models_loaded or not self.inv_status_model_info:
            curr = features_dict.get("current_stock", 100)
            rop = features_dict.get("reorder_point", 20)
            safety = features_dict.get("safety_stock", 10)
            if curr <= safety * 0.5:
                return "CRITICAL"
            elif curr <= rop:
                return "LOW"
            elif curr > rop * 3:
                return "OVERSTOCK"
            return "NORMAL"

        cols = self.inv_status_model_info["features"]
        df_in = pd.DataFrame([{col: features_dict.get(col, 0) for col in cols}])
        pred = self.inv_status_model_info["model"].predict(df_in)[0]
        return str(pred)

    def run_full_inference(self, features_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs all 5 models sequentially on a coherent feature payload.
        Returns a comprehensive AI prediction bundle.
        """
        predicted_demand = self.predict_demand(features_dict)
        short_term_demand = self.predict_short_term_demand(features_dict)
        
        # Enrich features with the predicted demand outputs
        features_dict["rolling_30d_demand"] = predicted_demand
        features_dict["rolling_7d_demand"] = short_term_demand

        stockout_risk = self.predict_stockout_risk(features_dict)
        recommended_reorder_qty = self.predict_reorder_quantity(features_dict)
        inventory_status = self.predict_inventory_status(features_dict)

        return {
            "predicted_demand": predicted_demand,
            "short_term_demand": short_term_demand,
            "stockout_risk": stockout_risk,
            "inventory_status": inventory_status,
            "recommended_reorder_quantity": recommended_reorder_qty
        }

# Global singleton accessor
prediction_service = MLPredictionService()
