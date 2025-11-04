"""
WebSocket consumer for real-time notifications.
Notifies sellers when new orders are placed for their products.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()


class OrderNotificationConsumer(AsyncWebsocketConsumer):
    """Consumer for order notifications to sellers"""
    
    async def connect(self):
        """Connect to websocket and join user-specific group"""
        self.user = self.scope.get("user")
        
        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)  # Unauthorized
            return
        
        # Join user-specific notification group
        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection',
            'message': 'WebSocket connected successfully',
            'user_id': self.user.id,
        }))
    
    async def disconnect(self, close_code):
        """Leave group on disconnect"""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle messages from client"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                # Respond to ping with pong
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': 'connected'
                }))
            elif message_type == 'authenticate':
                # Authentication is handled by AuthMiddlewareStack
                # Just acknowledge
                await self.send(text_data=json.dumps({
                    'type': 'authenticated',
                    'message': 'Authentication successful'
                }))
        except json.JSONDecodeError:
            pass
    
    async def order_notification(self, event):
        """Send order notification to client"""
        await self.send(text_data=json.dumps({
            'type': 'order_notification',
            'order': event.get('order', {}),
            'message': event.get('message', 'New order received'),
            'order_number': event.get('order_number'),
            'total_amount': event.get('total_amount'),
            'buyer_name': event.get('buyer_name'),
        }))


@database_sync_to_async
def get_user(user_id):
    """Get user by ID"""
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None

