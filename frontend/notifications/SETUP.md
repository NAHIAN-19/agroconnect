# WebSocket Notifications Setup Guide

This guide explains how to set up real-time notifications using Django Channels, Redis, and WebSockets.

## Backend Setup

### 1. Install Required Packages

```bash
pip install channels channels-redis daphne
```

### 2. Update Django Settings

Add to your main Django `settings.py`:

```python
INSTALLED_APPS = [
    # ... existing apps
    'channels',
    'notifications',  # Add this
    # ... rest of apps
]

# ASGI Configuration
ASGI_APPLICATION = 'your_project.asgi.application'

# Channel Layers Configuration (Redis)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],  # Redis server
        },
    },
}

# Middleware for WebSocket authentication
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

### 3. Update ASGI Configuration

If you don't have `asgi.py`, create it in your project root:

```python
# your_project/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import notifications.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            notifications.routing.websocket_urlpatterns
        )
    ),
})
```

### 4. Update Main URLs (Optional - for routing)

If needed, add websocket routing to your main `urls.py`:

```python
# Already handled by ASGI, but you can add if needed
```

### 5. Connect Signal

The signal is automatically connected when `notifications/apps.py` is loaded. Make sure `'notifications'` is in `INSTALLED_APPS`.

### 6. Run Redis Server

```bash
# Install Redis (if not installed)
# Ubuntu/Debian:
sudo apt-get install redis-server

# macOS:
brew install redis

# Start Redis
redis-server

# Or use Docker:
docker run -d -p 6379:6379 redis:alpine
```

### 7. Run Django with Daphne

Instead of `python manage.py runserver`, use:

```bash
daphne -b 0.0.0.0 -p 8000 your_project.asgi:application
```

Or in development, you can still use `runserver` but Channels will handle WebSocket connections.

## Frontend Setup

The frontend websocket connection is implemented in the notifications hook and automatically connects on app load.

### WebSocket URL

The frontend connects to: `ws://localhost:8000/ws/notifications/` (adjust host/port as needed)

## Testing

1. Start Redis: `redis-server`
2. Start Django with Daphne: `daphne -b 0.0.0.0 -p 8000 your_project.asgi:application`
3. Start frontend: `npm run dev`
4. Login as a seller
5. In another browser/account, place an order for the seller's product
6. Seller should receive a real-time notification

## Notes

- WebSocket connections require authentication (JWT token from cookies/headers)
- Notifications are sent only to sellers whose products are in the order
- Each user gets their own notification group: `user_{user_id}`
- The signal automatically sends notifications when orders are created

