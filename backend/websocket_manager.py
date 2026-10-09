"""
backend/websocket_manager.py
FastAPI WebSocket Connection Manager for broadcasting real-time warehouse events.
"""

import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("warehouse_websocket")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON-serializable dictionary to all active clients."""
        if not self.active_connections:
            return

        dead_connections = []
        payload = json.dumps(message, default=str)
        
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}. Marking for cleanup.")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

# Global singleton manager
ws_manager = ConnectionManager()
