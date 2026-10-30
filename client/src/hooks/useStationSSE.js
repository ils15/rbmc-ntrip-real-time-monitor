import { useEffect, useRef, useCallback } from 'react';
import { apiUrl } from '../api';

export function useStationSSE(onStationsUpdate, onConnectionChange, enabled = true) {
  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 10;

  const connect = useCallback(() => {
    if (!enabled) return;
    
    try {
      const es = new EventSource(apiUrl('/api/events'));
      eventSourceRef.current = es;

      es.onopen = () => {
        reconnectAttempts.current = 0;
        onConnectionChange?.(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.stations) {
            onStationsUpdate(data.stations, data.source);
          }
          reconnectAttempts.current = 0; // reset on successful message
        } catch (err) {
          console.error('[SSE] Parse error:', err);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        onConnectionChange?.(false);
        
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error('[SSE] Connection failed:', err);
      onConnectionChange?.(false);
    }
  }, [onStationsUpdate, onConnectionChange, enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  return {
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    }
  };
}
