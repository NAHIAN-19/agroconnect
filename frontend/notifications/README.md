# Notifications App

Real-time WebSocket notifications for order updates using Django Channels.

## Features

- ✅ Real-time order notifications to sellers
- ✅ Automatic WebSocket connection management
- ✅ Reconnection handling with exponential backoff
- ✅ Browser notification support
- ✅ Notification bell UI component

## Backend Files

- `consumers.py` - WebSocket consumer for handling connections
- `routing.py` - WebSocket URL routing
- `signals.py` - Django signal to send notifications when orders are created
- `apps.py` - App configuration with signal connection

## Frontend Files

- `src/hooks/useWebSocket.js` - WebSocket connection hook
- `src/components/NotificationBell.jsx` - Notification bell UI component

## Setup

See `SETUP.md` for detailed setup instructions.

## How It Works

1. When an order is created, the `notify_sellers_on_order` signal fires
2. Signal gets all sellers whose products are in the order
3. For each seller, sends a notification to their WebSocket group: `user_{seller_id}`
4. Frontend WebSocket connection receives the notification
5. Notification bell component displays the notification
6. Seller can click to view order details in dashboard

## WebSocket Authentication

WebSocket authentication is handled by Django Channels `AuthMiddlewareStack`, which automatically authenticates using session or token-based auth.

## Environment Variables

Frontend:
- `VITE_API_BASE_URL` - Used to determine WebSocket host/port
- `VITE_WS_HOST` - WebSocket host (optional, defaults to API host)
- `VITE_WS_PORT` - WebSocket port (optional, defaults to API port or 8000)

