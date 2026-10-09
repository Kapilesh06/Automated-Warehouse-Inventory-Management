"""
train.py
Top-level entry point to execute the full data and AI training pipeline:
1. Checks or generates synthetic dataset
2. Preprocesses data and engineers features
3. Splits chronologically
4. Trains 5 Machine Learning models
5. Evaluates metrics (MAE, RMSE, R2, Accuracy, F1)
6. Saves model artifacts and metrics
"""

import os
import sys
import json
from datetime import datetime

# Add root directory to python path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from generate_dataset import main as run_generate_dataset
from ml.train_models import train_all_models

def main():
    print("=" * 80)
    print("  AI-POWERED WAREHOUSE INVENTORY MANAGEMENT - TRAINING PIPELINE")
    print("=" * 80)
    
    tx_file = os.path.join(ROOT_DIR, "data", "warehouse_transactions.csv")
    prod_file = os.path.join(ROOT_DIR, "data", "products.csv")
    
    if not os.path.exists(tx_file) or not os.path.exists(prod_file):
        print("[!] Dataset missing. Running generate_dataset.py...")
        run_generate_dataset()
    else:
        print("[*] Dataset verified present in data/")
        
    print("\n[*] Starting AI model training...")
    metrics = train_all_models()
    
    print("\n" + "=" * 80)
    print("TRAINING PIPELINE SUMMARY & EVALUATION REPORT")
    print("=" * 80)
    for model_name, info in metrics["models"].items():
        print(f"\nModel: {model_name.upper()}")
        print(f"  Type:    {info['type']}")
        print(f"  Target:  {info['target']}")
        print(f"  Metrics: {info['metrics']}")
        
    print("\n" + "=" * 80)
    print("All 5 ML models trained and saved to models/ directory.")
    print("Run backend with: uvicorn backend.main:app --reload")
    print("=" * 80)

if __name__ == "__main__":
    main()
