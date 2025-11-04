"""
Django signals for sending websocket notifications
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from apps.orders.models import Order


@receiver(post_save, sender=Order)
def notify_sellers_on_order(sender, instance, created, **kwargs):
    """
    Send websocket notification to sellers when a new order is created.
    Notifies all sellers whose products are in the order.
    """
    if not created:  # Only notify on new orders
        return
    
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return  # Channels not configured
    except Exception:
        # Channels not set up, fail silently
        return
    
    # Get all sellers whose products are in this order
    sellers = set()
    for order_item in instance.order_items.all():
        if order_item.product and order_item.product.seller:
            sellers.add(order_item.product.seller)
    
    # Prepare notification data
    order_data = {
        'id': instance.id,
        'order_number': instance.order_number,
        'total_amount': float(instance.total_amount),
        'status': instance.status,
        'created_at': instance.created_at.isoformat(),
        'item_count': instance.order_items.count(),
    }
    
    if not sellers:
        return  # No sellers to notify
    
    buyer_name = 'Unknown'
    if instance.buyer:
        buyer_name = instance.buyer.get_full_name() or instance.buyer.email or 'Unknown'
    
    # Send notification to each seller
    for seller in sellers:
        try:
            group_name = f"user_{seller.id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'order_notification',
                    'order': order_data,
                    'message': f'New order #{instance.order_number} for your products',
                    'order_number': instance.order_number,
                    'total_amount': float(instance.total_amount),
                    'buyer_name': buyer_name,
                }
            )
        except Exception as e:
            # Log error but don't fail order creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send notification to seller {seller.id}: {str(e)}")

