"""
backend/genai_service.py
Generative AI Layer for Warehouse Inventory Management System using the Google Gemini API.

Architectural Role:
- Sits downstream of ML Models and Multi-Agent Orchestration.
- Synthesizes quantitative outputs (demands, risks, reorder points, stock balances)
  into clear, executive natural-language explanations, assistant dialogues, and reports.
- Enforces strict human-in-the-loop constraints: Gemini explains and advises,
  while human warehouse managers retain full approval and receiving authority.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

logger = logging.getLogger("warehouse_genai")

# System Instruction strictly bounding Gemini to warehouse reality & human-in-the-loop governance
WAREHOUSE_SYSTEM_INSTRUCTION = """You are an AI warehouse inventory assistant.

Your job is to explain warehouse inventory conditions, summarize inventory activity, explain AI-generated inventory recommendations, identify important inventory risks, and answer warehouse-management questions.

Use only the warehouse data supplied by the application.

Never invent:
* product names
* stock quantities
* suppliers
* purchase orders
* prices
* demand predictions
* reorder quantities
* transaction information
* stock receipts

If required information is not available, clearly state that the information is unavailable.

Do not automatically place supplier orders.

AI recommendations require human approval.

Do not claim that a purchase order exists unless the application data confirms it.

Do not claim that stock was received unless the application contains a confirmed stock receipt.

Do not modify inventory directly.

Your role is to provide explanations, summaries, reports, and decision-support information to the warehouse manager."""


class GeminiService:
    """Manages interactions with the official Google Gemini API SDK."""

    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.default_model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash").strip()
        self._client = None

    def get_api_key(self) -> str:
        # Dynamically reload from .env in case it was edited during runtime
        load_dotenv(override=True)
        return os.environ.get("GEMINI_API_KEY", self.api_key).strip()

    def get_model_name(self) -> str:
        load_dotenv(override=True)
        return os.environ.get("GEMINI_MODEL", self.default_model).strip()

    def is_configured(self) -> bool:
        key = self.get_api_key()
        return bool(key and key != "YOUR_GEMINI_API_KEY" and len(key) > 10)

    def _get_client(self):
        key = self.get_api_key()
        if not self.is_configured():
            return None
        try:
            from google import genai
            return genai.Client(api_key=key)
        except Exception as e:
            logger.error(f"Failed to initialize Google GenAI Client: {e}")
            return None

    def _call_gemini(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes a Gemini prompt using the official SDK.
        Includes automatic fallback across available models (e.g. gemini-3.5-flash, gemini-3.5-flash-lite, gemini-flash-latest).
        Returns a dict: {"success": bool, "text": str, "error": Optional[str]}
        """
        if not self.is_configured():
            return {
                "success": False,
                "text": (
                    "Gemini AI unavailable. Please configure a valid GEMINI_API_KEY in the .env file "
                    "or environment variables to enable generative AI explanations."
                ),
                "error": "GEMINI_API_KEY not configured"
            }

        client = self._get_client()
        if not client:
            return {
                "success": False,
                "text": "Gemini AI client could not be initialized. Please check your environment configuration.",
                "error": "Client initialization failed"
            }

        primary_model = self.get_model_name()
        candidate_models = [primary_model]
        for m in ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"]:
            if m not in candidate_models:
                candidate_models.append(m)

        sys_inst = system_instruction or WAREHOUSE_SYSTEM_INSTRUCTION
        last_error = None

        from google.genai import types

        for model_name in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=sys_inst,
                        temperature=0.2,  # Low temperature for factual precision
                    )
                )

                response_text = response.text or ""
                return {
                    "success": True,
                    "text": response_text.strip(),
                    "error": None
                }

            except Exception as e:
                err_str = str(e)
                last_error = err_str
                logger.warning(f"Gemini API attempt with {model_name} failed: {err_str[:120]}. Trying next fallback model...")

        sanitized_err = last_error.split("key=")[0] if last_error and "key=" in last_error else (last_error or "Unknown error")
        return {
            "success": False,
            "text": (
                "Unable to generate AI response from Gemini at this moment. "
                "The warehouse management system remains fully operational."
            ),
            "error": f"Gemini API error: {sanitized_err}"
        }

    # -------------------------------------------------------------
    # FEATURE 1: EXPLAIN REORDER RECOMMENDATION
    # -------------------------------------------------------------
    def generate_reorder_explanation(self, context_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes structured facts for a specific SKU (stock, reorder point, demand, risk, lead time, decision)
        and prompts Gemini to produce a clear, human-in-the-loop explanation for warehouse managers.
        """
        prompt = f"""Explain the following warehouse reorder recommendation clearly and concisely for the warehouse manager:

STRUCTURED INVENTORY & AI PREDICTION DATA:
{json.dumps(context_data, indent=2)}

INSTRUCTIONS FOR YOUR EXPLANATION:
1. State the product name and current stock compared to its reorder point and safety stock.
2. Mention the predicted demand and supplier lead time.
3. Explain the stockout risk level and why the multi-agent system recommended this specific reorder quantity.
4. Explicitly remind the manager that this recommendation requires their review and manual approval before any purchase order can be drafted.
5. Keep the explanation professional, concise, and grounded solely in the provided numbers. Do not invent details."""

        result = self._call_gemini(prompt)
        return result

    # -------------------------------------------------------------
    # FEATURE 2: INVENTORY AI ASSISTANT (CHAT)
    # -------------------------------------------------------------
    def answer_inventory_question(self, question: str, context_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Answers warehouse inventory questions using real-time retrieved facts.
        """
        prompt = f"""You are answering a question from the warehouse manager.

RELEVANT CURRENT WAREHOUSE DATA:
{json.dumps(context_data, indent=2)}

MANAGER'S QUESTION:
"{question}"

INSTRUCTIONS:
- Answer the question directly using ONLY the facts provided in the warehouse data above.
- If the question asks about a specific product, reference its exact current stock, reorder point, lead time, and prediction data.
- If the question asks which products need reordering or are at risk, list the matching items from the provided data.
- If relevant data is not present in the provided context, state that clearly rather than guessing.
- Maintain a helpful, analytical warehouse operations tone.
- Emphasize human-in-the-loop approval if discussing reorders or purchases."""

        result = self._call_gemini(prompt)
        return result

    # -------------------------------------------------------------
    # FEATURE 3: DAILY INVENTORY SUMMARY
    # -------------------------------------------------------------
    def generate_daily_summary(self, summary_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a comprehensive executive daily summary for warehouse management.
        """
        prompt = f"""Generate a comprehensive Daily Inventory Summary for the warehouse manager based on the following real-time data:

APPLICATION DATA SNAPSHOT:
{json.dumps(summary_data, indent=2)}

STRUCTURE YOUR RESPONSE EXACTLY AS FOLLOWS:
# Daily Inventory Summary

### 1. Overall Status
(Brief overview of total SKUs, active stock value, and general warehouse health)

### 2. Low Stock & Out of Stock Alerts
(Specific items with zero stock or stock below reorder thresholds)

### 3. High Risk Products
(Products flagged with HIGH or CRITICAL stockout risk by ML models)

### 4. Reorder Recommendations
(Summary of pending AI reorder recommendations awaiting manager approval)

### 5. Recent Warehouse Activity
(Summary of recent stock movements, transaction volumes, and open purchase orders)

### 6. Recommended Action Items for Manager Review
(Actionable bullet points for the manager's immediate attention today)

STRICT RULE: Reference only the real numbers and names in the snapshot above. Do not invent any products, suppliers, or transactions."""

        result = self._call_gemini(prompt)
        return result

    # -------------------------------------------------------------
    # FEATURE 4: AI REPORTS
    # -------------------------------------------------------------
    def generate_inventory_report(self, report_type: str, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates specialized operational reports:
        - daily_inventory
        - weekly_inventory
        - reorder_risk
        - stockout_risk
        - supplier_po
        """
        type_titles = {
            "daily_inventory": "Daily Inventory Operations Report",
            "weekly_inventory": "Weekly Warehouse Inventory & Velocity Report",
            "reorder_risk": "Inventory Reorder & Replenishment Risk Report",
            "stockout_risk": "Stockout Risk & Safety Stock Exposure Report",
            "supplier_po": "Supplier Performance & Purchase Order Summary Report"
        }
        title = type_titles.get(report_type, "Warehouse Inventory Intelligence Report")

        prompt = f"""Generate a professional, structured '{title}' for warehouse leadership.

REPORT TYPE: {report_type}
CURRENT WAREHOUSE TELEMETRY:
{json.dumps(report_data, indent=2)}

REPORT REQUIREMENTS:
- Provide an Executive Summary.
- Provide Key Findings supported by the actual numbers in the data.
- Provide a Detailed Analysis section categorized by priority.
- Provide Strategic Manager Recommendations (highlighting that human approval is required for all procurement actions).
- Use professional markdown formatting with bold metrics and clear bullet points.
- Strictly adhere to the numbers provided; do not hallucinate products or balances."""

        result = self._call_gemini(prompt)
        return result


# Singleton instance
gemini_service = GeminiService()
