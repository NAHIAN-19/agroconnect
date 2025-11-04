import { useEffect, useRef, useState, useCallback } from 'react';
import useAuthStore from '../store/useAuthStore';

/**
 * WebSocket hook for real-time notifications
 * Connects to Django Channels WebSocket for order notifications
 */
export const useWebSocket = () => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const pingIntervalRef = useRef(null);
  const { user, access_token, isAuth } = useAuthStore();

  const connect = useCallback(() => {
    if (!isAuth || !access_token || !user) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Get WebSocket URL from environment or default
    // Use same protocol/host as current page, or from env
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
    // Extract host and port from API base URL or use defaults
    let wsHost = 'localhost';
    let wsPort = '8000';
    
    if (apiBaseUrl) {
      try {
        const url = new URL(apiBaseUrl);
        wsHost = url.hostname;
        // For WebSocket, use the same port as API, but default to 8000 for localhost
        if (url.port) {
          wsPort = url.port;
        } else {
          wsPort = url.protocol === 'https:' ? '443' : '8000';
          if (wsHost === 'localhost' && !url.port) {
            wsPort = '8000';
          }
        }
      } catch (e) {
        // Fallback to defaults
        wsHost = window.location.hostname;
        wsPort = import.meta.env.VITE_WS_PORT || '8000';
      }
    } else {
      wsHost = window.location.hostname;
      wsPort = import.meta.env.VITE_WS_PORT || '8000';
    }
    
    // Add token to query string for WebSocket authentication
    const token = access_token || '';
    const queryParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws/notifications/${queryParam}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send authentication token
        if (access_token) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            token: access_token,
          }));
        }

        // Send ping to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            if (pingIntervalRef.current) {
              clearInterval(pingIntervalRef.current);
              pingIntervalRef.current = null;
            }
          }
        }, 30000); // Ping every 30 seconds

        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'order_notification') {
            // Add notification to state
            setNotifications((prev) => [
              {
                id: Date.now(),
                type: 'order',
                message: data.message,
                order: data.order,
                order_number: data.order_number,
                total_amount: data.total_amount,
                buyer_name: data.buyer_name,
                timestamp: new Date(),
              },
              ...prev.slice(0, 49), // Keep last 50 notifications
            ]);

            // Show browser notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Order', {
                body: data.message,
                icon: '/favicon.ico',
              });
            }
          } else if (data.type === 'pong') {
            // Connection is alive
            console.log('WebSocket pong received');
          } else if (data.type === 'connection') {
            // Connection confirmed
            console.log('WebSocket connection confirmed:', data.message);
          } else if (data.type === 'authenticated') {
            // Authentication confirmed
            console.log('WebSocket authentication confirmed');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Don't reconnect if closed intentionally (code 1000) or unauthorized (4001)
        if (event.code === 1000 || event.code === 4001) {
          console.log('WebSocket closed intentionally or unauthorized, not reconnecting');
          return;
        }

        // Attempt to reconnect only if still authenticated
        if (isAuth && access_token && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
            connect();
          }, delay);
        } else {
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
          }
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [isAuth, access_token, user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    // Only connect if authenticated and have token
    if (isAuth && user && access_token) {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Small delay to avoid rapid reconnects during state updates
      const connectTimeout = setTimeout(() => {
        connect();
      }, 100);

      return () => {
        clearTimeout(connectTimeout);
        disconnect();
      };
    } else {
      disconnect();
      return () => {};
    }
  }, [isAuth, user, access_token, connect, disconnect]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    isConnected,
    notifications,
    clearNotifications,
    connect,
    disconnect,
  };
};

