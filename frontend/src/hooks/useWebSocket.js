/**
 * src/hooks/useWebSocket.js
 * React Hook for persistent real-time WebSocket connection to /ws.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(onEvent) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    // Determine ws url based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in vite dev server, connect to 8001 (or window.location.host)
    const host = window.location.port === '5173' ? 'localhost:8001' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        console.log('[WebSocket] Connected to warehouse real-time feed');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastEvent(payload);
          if (onEvent) {
            onEvent(payload);
          }
        } catch (e) {
          // Plain text message (e.g. PONG)
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        console.log('[WebSocket] Disconnected. Reconnecting in 3s...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.warn('[WebSocket] Error:', err);
        socket.close();
      };
    } catch (err) {
      console.error('[WebSocket] Initialization failed:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 4000);
    }
  }, [onEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendPing = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send('PING');
    }
  }, []);

  return { isConnected, lastEvent, sendPing };
}
