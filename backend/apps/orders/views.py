from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.core.cache import cache
from django.db.models import Q, Sum, Count
from django.utils import timezone

from utils.response import APIResponse
from apps.orders.models import Order, OrderItem, OrderReview
from .serializers import (
    OrderListSerializer,
    OrderDetailSerializer,
    OrderCreateSerializer,
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

from .filters import OrderFilter
from utils.pagination import OrderPagination
from apps.orders.permissions import IsBuyer, IsBuyerOrReadOnly, IsOrderOwnerOrSeller, IsSellerForShipment, IsSeller
from apps.users.permissions import IsAdminVerified

logger = logging.getLogger(__name__)

class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Order model.
    
    list: Get orders (buyers see their own, sellers see orders for their products)
    retrieve: Get single order detail
    create: Create new order (buyer only)
    update: Update order (limited - only sellers can update shipment status)
    """
    
    queryset = Order.objects.select_related('buyer', 'buyer__buyer_profile').prefetch_related('order_items__product__seller')
    permission_classes = [IsBuyerOrReadOnly, IsOrderOwnerOrSeller]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = OrderFilter
    search_fields = ['order_number', 'recipient_name', 'recipient_phone']
    ordering_fields = ['created_at', 'total_amount', 'status']
    ordering = ['-created_at']  # Default, but get_queryset will override with status priority
    pagination_class = OrderPagination
    
    def get_queryset(self):
        """
        Order queryset: Filter by user role and sort by delivery status priority.
        - Buyers see only their own orders
        - Sellers see orders containing their products
        - Non-delivered orders first (sorted by date, newest first),
        - Then delivered orders (sorted by date, newest first).
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
        
        # Filter based on user role
        # Buyers see only their own orders
        if user.role == 'BUYER':
            queryset = queryset.filter(buyer=user)
        # Sellers see orders that contain their products
        elif user.role == 'SELLER':
            queryset = queryset.filter(order_items__product__seller=user).distinct()
        
        # Only apply status-based sorting if no explicit ordering is requested
        ordering_param = self.request.query_params.get('ordering', '')
        if not ordering_param:
            # Use Django's Case/When to separate non-delivered from delivered
            from django.db.models import Case, When, IntegerField
            
            # Non-delivered orders get priority 1, delivered get priority 2
            delivery_priority = Case(
                When(status__in=[Order.StatusChoices.PENDING, Order.StatusChoices.PAID, Order.StatusChoices.PROCESSING, Order.StatusChoices.SHIPPED], then=1),
                When(status__in=[Order.StatusChoices.DELIVERED, Order.StatusChoices.CANCELLED, Order.StatusChoices.REFUNDED], then=2),
                default=2,
                output_field=IntegerField(),
            )
            
            # Order by delivery priority (non-delivered first), then by date (descending, newest first)
            queryset = queryset.annotate(delivery_priority=delivery_priority).order_by('delivery_priority', '-created_at')
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return OrderCreateSerializer
        elif self.action == 'list':
            return OrderListSerializer
        return OrderDetailSerializer
    
    def get_permissions(self):
        """Override to use different permissions for different actions"""
        
        # 1. FOR CREATING AN ORDER:
        # User must be logged in AND verified by an admin.
        # This allows both Buyers and Sellers to create orders.
        if self.action == 'create':
            return [IsAuthenticated(), IsAdminVerified()]
        
        # 2. FOR UPDATING SHIPMENT (e.g., 'ship' action)
        elif self.action in ['update', 'partial_update', 'ship']:
            return [IsAuthenticated(), IsSellerForShipment()]
            
        # 3. FOR EVERYTHING ELSE (list, retrieve, track):
        # User must be logged in AND be the owner (buyer) or a seller 
        # involved in the order.
        return [IsAuthenticated(), IsOrderOwnerOrSeller()]
    
    def partial_update(self, request, pk=None):
        """
        Allow sellers to update order status (e.g., cancel order).
        Only sellers whose product is in the order can update it.
        """
        order = self.get_object()
        
        # Verify seller has product in this order
        seller_ids = order.seller_ids
        if request.user.id not in seller_ids:
            return APIResponse.error(
                message="You can only update orders containing your products",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        # Only allow updating status to 'cancelled' for now
        new_status = request.data.get('status')
        if new_status and new_status != Order.StatusChoices.CANCELLED:
            return APIResponse.error(
                message="Only cancellation is allowed via this endpoint. Use /ship/ to ship orders.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent cancelling already delivered/cancelled orders
        if order.status in [Order.StatusChoices.DELIVERED, Order.StatusChoices.CANCELLED]:
            return APIResponse.error(
                message=f"Cannot cancel order with status: {order.status}",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Update status if provided
        if new_status:
            order.status = new_status
            order.save(update_fields=['status', 'updated_at'])
        
        # Return updated order
        serializer = self.get_serializer(order)
        return APIResponse.success(
            message="Order updated successfully",
            data=serializer.data
        )
    
    def create(self, request, *args, **kwargs):
        """Create a new order - requires admin verification"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # We need to set the buyer from the request *before* saving
        # The OrderCreateSerializer should have a 'buyer' field
        order = serializer.save(buyer=request.user)
        
        # --- Notify sellers about new order via websocket ---
        try:
            # 1. Get the channel layer
            channel_layer = get_channel_layer()

            # 2. Get the unique IDs of all sellers in this order
            # (Assuming your Order model has a way to get this)
            seller_ids = order.seller_ids 

            # 3. Get buyer's name for the notification
            buyer_name = request.user.get_full_name() or request.user.email

            # 4. Loop and send a notification to each seller's group
            for seller_id in seller_ids:
                group_name = f"seller_{seller_id}"
                event = {
                    "type": "seller.notification", # This is the consumer method name
                    "message": f"You have a new order (ID: {order.order_number}) from {buyer_name}.",
                    "notification_type": "new_order",
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "buyer_name": buyer_name,
                }
                
                # Use async_to_sync to call the async group_send from sync code
                async_to_sync(channel_layer.group_send)(group_name, event)
            
            logger.info(f"Sent new order notifications to sellers: {seller_ids}")

        except Exception as e:
            # Log the error but don't crash the API call
            # The order was created, but notification failed.
            logger.error(f"Failed to send WebSocket notification for order {order.id}: {e}")
        
        # --- End of WebSocket notification ---


        # Return full order detail
        detail_serializer = OrderDetailSerializer(order, context={'request': request})
        
        return APIResponse.success(
            message="Order created successfully",
            data=detail_serializer.data,
            status_code=status.HTTP_201_CREATED # Use 201 for 'create'
        )
    
    def list(self, request, *args, **kwargs):
        """List orders with filtering and pagination"""
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(
            message="Orders retrieved successfully",
            data=serializer.data
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve single order detail"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return APIResponse.success(
            message="Order retrieved successfully",
            data=serializer.data
        )
    
    @action(detail=True, methods=['patch'], permission_classes=[IsSeller])
    def confirm(self, request, pk=None):
        """
        Seller endpoint to confirm an order and deduct product quantity from stock.
        """
        order = self.get_object()

        # Verify seller has product in this order
        seller_ids = order.seller_ids
        if request.user.id not in seller_ids:
            return APIResponse.error(
                message="You can only confirm orders containing your products",
                status_code=status.HTTP_403_FORBIDDEN
            )

        # Check if the order is already confirmed or shipped
        if order.status in [Order.StatusChoices.CONFIRMED, Order.StatusChoices.SHIPPED]:
            return APIResponse.error(
                message="Order is already confirmed or shipped",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Deduct product quantity from stock
        for item in order.order_items.all():
            product = item.product
            if product.stock < item.quantity:
                return APIResponse.error(
                    message=f"Not enough stock for product: {product.name}",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            product.stock -= item.quantity
            product.save()

        # Update order status
        order.status = Order.StatusChoices.CONFIRMED
        order.save()

        serializer = self.get_serializer(order)
        return APIResponse.success(
            message="Order confirmed successfully. Stock updated.",
            data=serializer.data
        )

    @action(detail=True, methods=['patch'], permission_classes=[IsSellerForShipment])
    def ship(self, request, pk=None):
        """
        Seller endpoint to mark order as shipped and create RedX shipment.
        Only sellers whose product is in the order can call this.
        """
        order = self.get_object()
        
        # Verify seller has product in this order
        seller_ids = order.seller_ids
        if request.user.id not in seller_ids:
            return APIResponse.error(
                message="You can only ship orders containing your products",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        # Check if payment is completed
        if order.payment_status != 'success' and order.payment_method == Order.PAYMENT_METHOD_SSLCOMMERZ:
            return APIResponse.error(
                message="Cannot ship order: Payment not completed",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Check if the order is confirmed
        if order.status != Order.StatusChoices.CONFIRMED:
            return APIResponse.error(
                message="Cannot ship order: Order not confirmed",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Create RedX shipment
        from .utils import create_redx_shipment
        shipment_result = create_redx_shipment(order)
        
        if shipment_result['success']:
            # Update order status
            if order.status in [Order.StatusChoices.PENDING, Order.StatusChoices.PAID]:
                order.status = Order.StatusChoices.SHIPPED
            
            order.shipping_status = 'in_transit'
            order.shipped_at = timezone.now()
            order.redx_tracking_number = shipment_result.get('tracking_number', '')
            order.redx_order_id = shipment_result.get('order_id', '')
            order.save()
            
            serializer = self.get_serializer(order)
            return APIResponse.success(
                message="Order shipped successfully. RedX shipment created.",
                data=serializer.data
            )
        else:
            return APIResponse.error(
                message=f"Failed to create RedX shipment: {shipment_result.get('error', 'Unknown error')}",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], permission_classes=[IsOrderOwnerOrSeller])
    def track(self, request, pk=None):
        """Get order tracking information"""
        order = self.get_object()
        
        tracking_data = {
            'order_number': order.order_number,
            'status': order.status,
            'shipping_status': order.shipping_status,
            'redx_tracking_number': order.redx_tracking_number,
            'shipped_at': order.shipped_at,
            'delivered_at': order.delivered_at,
            'recipient_name': order.recipient_name,
            'recipient_phone': order.recipient_phone,
            'recipient_address': order.recipient_address,
        }
        
        # If RedX tracking number exists, fetch live tracking updates
        if order.redx_tracking_number:
            from .utils import track_redx_shipment, get_redx_parcel_info
            
            # Get tracking updates
            tracking_result = track_redx_shipment(order.redx_tracking_number)
            if tracking_result.get('success'):
                tracking_data['redx_tracking'] = tracking_result.get('tracking', [])
            
            # Get parcel info for additional details
            parcel_result = get_redx_parcel_info(order.redx_tracking_number)
            if parcel_result.get('success'):
                parcel = parcel_result.get('parcel', {})
                tracking_data['redx_parcel_info'] = {
                    'status': parcel.get('status'),
                    'delivery_area': parcel.get('delivery_area'),
                    'charge': parcel.get('charge'),
                    'created_at': parcel.get('created_at'),
                    'delivery_type': parcel.get('delivery_type'),
                }
        
        return APIResponse.success(
            message="Tracking information retrieved successfully",
            data=tracking_data
        )
    
    @action(detail=False, methods=['get'], url_path='my')
    def my_orders(self, request):
        """Get current user's own orders (orders where user is the buyer)"""
        # Allow all authenticated users to see their personal orders
        # Filter to only show orders where the current user is the buyer
        queryset = self.get_queryset().filter(buyer=request.user)
        queryset = self.filter_queryset(queryset).order_by('-created_at')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(
            message="Your orders retrieved successfully",
            data=serializer.data
        )
    
    @action(detail=False, methods=['get'], url_path='seller')
    def seller_orders(self, request):
        """Get orders for seller's products"""
        if request.user.role != 'SELLER':
            return APIResponse.error(
                message="This endpoint is only available for sellers",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(order_items__product__seller=request.user).distinct()
        queryset = self.filter_queryset(queryset)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(
            message="Seller orders retrieved successfully",
            data=serializer.data
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsBuyer])
    def review(self, request, pk=None):
        """Create a review for a delivered order"""
        order = self.get_object()
        
        # Verify buyer owns this order
        if order.buyer != request.user:
            return APIResponse.error(
                message="You can only review your own orders",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        # Check if review already exists
        if hasattr(order, 'order_review') and order.order_review:
            return APIResponse.error(
                message="You have already reviewed this order",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if order is delivered
        if order.status != Order.StatusChoices.DELIVERED:
            return APIResponse.error(
                message="You can only review delivered orders",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Check time restriction
        min_days = 30  # 1 month
        if not order.delivered_at:
            return APIResponse.error(
                message="Order has not been delivered yet",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        days_since_delivery = (timezone.now() - order.delivered_at).days
        if days_since_delivery < min_days:
            remaining_days = min_days - days_since_delivery
            return APIResponse.error(
                message=f"You can review this order in {remaining_days} day(s)",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Create review
        from .serializers import OrderReviewCreateSerializer
        
        serializer = OrderReviewCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save(order=order, buyer=request.user)
            return APIResponse.success(
                message="Review submitted successfully",
                data=serializer.data
            )
        
        return APIResponse.error(
            message="Validation error",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

