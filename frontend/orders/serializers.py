from rest_framework import serializers
from .models import Order, OrderItem, OrderReview
from products.serializers import ProductListSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for OrderItem - used in OrderDetailSerializer"""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.URLField(source='product.image', read_only=True)
    seller_id = serializers.IntegerField(source='product.seller_id', read_only=True)
    seller_name = serializers.CharField(source='product.seller_name', read_only=True)
    unit = serializers.CharField(source='product.unit', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_id', 'product_name', 'product_image',
            'quantity', 'unit_price', 'total_price', 'unit',
            'seller_id', 'seller_name', 'created_at'
        ]
        read_only_fields = ['id', 'total_price', 'created_at']


class OrderListSerializer(serializers.ModelSerializer):
    """Serializer for listing orders (compact view)"""
    
    buyer_name = serializers.CharField(read_only=True)
    item_count = serializers.SerializerMethodField()
    first_product_name = serializers.SerializerMethodField()
    first_product_image = serializers.SerializerMethodField()
    order_review = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    days_until_reviewable = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer', 'buyer_name',
            'status', 'payment_status', 'total_amount',
            'item_count', 'first_product_name', 'first_product_image',
            'order_review', 'can_review', 'days_until_reviewable',
            'created_at', 'delivered_at', 'recipient_address', 'redx_tracking_number'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'order_review', 'can_review', 'days_until_reviewable']
    
    def get_order_review(self, obj):
        """Get existing review if available"""
        try:
            review = obj.order_review
            return {
                'id': review.id,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.created_at,
            }
        except OrderReview.DoesNotExist:
            return None
    
    def get_can_review(self, obj):
        """Check if order can be reviewed"""
        from django.utils import timezone
        
        if obj.status != Order.StatusChoices.DELIVERED:
            return False
        
        if not obj.delivered_at:
            return False
        
        # Check if review already exists
        try:
            if obj.order_review:
                return False
        except OrderReview.DoesNotExist:
            pass
        
        # Check time restriction (1 month minimum)
        min_days = 30  # 1 month
        days_since_delivery = (timezone.now() - obj.delivered_at).days
        return days_since_delivery >= min_days
    
    def get_days_until_reviewable(self, obj):
        """Calculate days until order can be reviewed"""
        from django.utils import timezone
        
        if obj.status != Order.STATUS_DELIVERED or not obj.delivered_at:
            return None
        
        # Check if review already exists
        try:
            if obj.order_review:
                return 0
        except OrderReview.DoesNotExist:
            pass
        
        min_days = 30  # 1 month
        days_since_delivery = (timezone.now() - obj.delivered_at).days
        
        if days_since_delivery < min_days:
            return min_days - days_since_delivery
        
        return 0
    
    def get_item_count(self, obj):
        """Returns total number of items in the order"""
        return obj.order_items.count()
    
    def get_first_product_name(self, obj):
        """Returns name of first product in order"""
        first_item = obj.order_items.first()
        return first_item.product.name if first_item else None
    
    def get_first_product_image(self, obj):
        """Returns image URL of first product in order"""
        first_item = obj.order_items.first()
        return first_item.product.image if first_item else None


class OrderDetailSerializer(serializers.ModelSerializer):
    """Serializer for order details (full view with items)"""
    
    buyer_name = serializers.CharField(read_only=True)
    order_items = OrderItemSerializer(many=True, read_only=True)
    order_review = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    days_until_reviewable = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer', 'buyer_name',
            'subtotal', 'delivery_fee', 'total_amount',
            'status', 'payment_method', 'payment_status',
            'sslcommerz_tran_id', 'sslcommerz_val_id', 'payment_date',
            'recipient_name', 'recipient_phone', 'recipient_address',
            'recipient_city', 'recipient_area', 'recipient_postcode',
            'redx_order_id', 'redx_tracking_number', 'shipping_status',
            'shipped_at', 'delivered_at', 'notes',
            'order_items', 'order_review', 'can_review', 'days_until_reviewable',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'total_amount', 'created_at', 'updated_at',
            'sslcommerz_val_id', 'payment_date', 'redx_tracking_number',
            'shipped_at', 'delivered_at', 'order_review', 'can_review', 'days_until_reviewable'
        ]
    
    def get_order_review(self, obj):
        """Get existing review if available"""
        try:
            review = obj.order_review
            return {
                'id': review.id,
                'rating': review.rating,
                'comment': review.comment,
                'created_at': review.created_at,
                'buyer_name': review.buyer_name,
                'buyer_avatar': review.buyer_avatar,
            }
        except OrderReview.DoesNotExist:
            return None
    
    def get_can_review(self, obj):
        """Check if order can be reviewed"""
        from django.utils import timezone
        
        if obj.status != Order.StatusChoices.DELIVERED:
            return False
        
        if not obj.delivered_at:
            return False
        
        # Check if review already exists
        try:
            if obj.order_review:
                return False
        except OrderReview.DoesNotExist:
            pass
        
        # Check time restriction (1 month minimum)
        min_days = 30  # 1 month
        days_since_delivery = (timezone.now() - obj.delivered_at).days
        return days_since_delivery >= min_days
    
    def get_days_until_reviewable(self, obj):
        """Calculate days until order can be reviewed"""
        from django.utils import timezone
        
        if obj.status != Order.STATUS_DELIVERED or not obj.delivered_at:
            return None
        
        # Check if review already exists
        try:
            if obj.order_review:
                return 0
        except OrderReview.DoesNotExist:
            pass
        
        min_days = 30  # 1 month
        days_since_delivery = (timezone.now() - obj.delivered_at).days
        
        if days_since_delivery < min_days:
            return min_days - days_since_delivery
        
        return 0


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new order"""
    
    items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        help_text="List of items: [{'product_id': 1, 'quantity': 2}, ...]"
    )
    
    class Meta:
        model = Order
        fields = [
            'items', 'recipient_name', 'recipient_phone', 'recipient_address',
            'recipient_city', 'recipient_area', 'recipient_postcode',
            'payment_method', 'notes', 'delivery_fee'
        ]
    
    def validate_items(self, value):
        """Validate that items list is not empty"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("Order must contain at least one item")
        return value
    
    def create(self, validated_data):
        """Create order with order items"""
        items_data = validated_data.pop('items')
        buyer = self.context['request'].user
        
        # Calculate subtotal
        subtotal = 0
        order_items = []
        
        for item_data in items_data:
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity', 1)
            
            try:
                from products.models import Product
                product = Product.objects.get(id=product_id, is_active=True)
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with id {product_id} not found or inactive")
            
            # Check stock
            if product.stock < quantity:
                raise serializers.ValidationError(
                    f"Insufficient stock for {product.name}. Available: {product.stock}, Requested: {quantity}"
                )
            
            # Prevent buyers from ordering their own products (if they're also sellers)
            if product.seller_id == buyer.id:
                raise serializers.ValidationError(
                    f"You cannot order your own product: {product.name}"
                )
            
            unit_price = product.price
            total_price = quantity * unit_price
            subtotal += total_price
            
            order_items.append({
                'product': product,
                'quantity': quantity,
                'unit_price': unit_price,
                'total_price': total_price
            })
        
        # Set subtotal and calculate total
        validated_data['subtotal'] = subtotal
        validated_data['buyer'] = buyer
        validated_data['delivery_fee'] = validated_data.get('delivery_fee', 50.00)
        validated_data['total_amount'] = subtotal + validated_data['delivery_fee']
        
        # Create order
        order = Order.objects.create(**validated_data)
        
        # Create order items and reduce stock
        for item_data in order_items:
            OrderItem.objects.create(order=order, **item_data)
            # Reduce product stock
            item_data['product'].stock -= item_data['quantity']
            item_data['product'].save(update_fields=['stock'])
        
        return order


class OrderReviewSerializer(serializers.ModelSerializer):
    """Serializer for order reviews"""
    
    buyer_name = serializers.CharField(read_only=True)
    buyer_avatar = serializers.CharField(read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    can_review = serializers.SerializerMethodField()
    days_until_reviewable = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderReview
        fields = [
            'id', 'order', 'order_number', 'buyer', 'buyer_name', 'buyer_avatar',
            'rating', 'comment', 'can_review', 'days_until_reviewable',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'buyer', 'created_at', 'updated_at']
    
    def get_can_review(self, obj):
        """Check if order can be reviewed (for new reviews)"""
        if hasattr(obj, 'order') and obj.order:
            # This is for creating a new review - check order eligibility
            from django.utils import timezone
            from datetime import timedelta
            
            if not obj.order.delivered_at or obj.order.status != Order.STATUS_DELIVERED:
                return False
            
            min_days = 30  # 1 month
            days_since_delivery = (timezone.now() - obj.order.delivered_at).days
            return days_since_delivery >= min_days
        
        # If review already exists
        return True
    
    def get_days_until_reviewable(self, obj):
        """Calculate days until order can be reviewed"""
        if hasattr(obj, 'order') and obj.order and obj.order.delivered_at:
            from django.utils import timezone
            
            min_days = 30  # 1 month
            days_since_delivery = (timezone.now() - obj.order.delivered_at).days
            
            if days_since_delivery < min_days:
                return min_days - days_since_delivery
        
        return 0
    
    def validate(self, data):
        """Validate review creation"""
        order = data.get('order')
        buyer = self.context['request'].user
        
        # Check if order belongs to buyer
        if order.buyer != buyer:
            raise serializers.ValidationError("You can only review your own orders")
        
        # Check if order is delivered
        if order.status != Order.StatusChoices.DELIVERED:
            raise serializers.ValidationError("You can only review delivered orders")
        
        # Check if order was delivered
        if not order.delivered_at:
            raise serializers.ValidationError("Order has not been delivered yet")
        
        # Check time restriction (1 month minimum)
        from django.utils import timezone
        
        min_days = 30  # 1 month
        days_since_delivery = (timezone.now() - order.delivered_at).days
        
        if days_since_delivery < min_days:
            remaining_days = min_days - days_since_delivery
            raise serializers.ValidationError(
                f"You can review this order in {remaining_days} day(s)"
            )
        
        # Check if review already exists
        if OrderReview.objects.filter(order=order).exists():
            raise serializers.ValidationError("You have already reviewed this order")
        
        return data
    
    def create(self, validated_data):
        """Create review with buyer from request"""
        validated_data['buyer'] = self.context['request'].user
        return super().create(validated_data)


class OrderReviewCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating reviews"""
    
    class Meta:
        model = OrderReview
        fields = ['order', 'rating', 'comment']
    
    def validate(self, data):
        """Validate review creation"""
        order = data.get('order')
        buyer = self.context['request'].user
        
        # Check if order belongs to buyer
        if order.buyer != buyer:
            raise serializers.ValidationError("You can only review your own orders")
        
        # Check if order is delivered
        if order.status != Order.StatusChoices.DELIVERED:
            raise serializers.ValidationError("You can only review delivered orders")
        
        # Check if order was delivered
        if not order.delivered_at:
            raise serializers.ValidationError("Order has not been delivered yet")
        
        # Check time restriction (1 month minimum)
        from django.utils import timezone
        
        min_days = 30  # 1 month
        days_since_delivery = (timezone.now() - order.delivered_at).days
        
        if days_since_delivery < min_days:
            remaining_days = min_days - days_since_delivery
            raise serializers.ValidationError(
                f"You can review this order in {remaining_days} day(s)"
            )
        
        # Check if review already exists
        if OrderReview.objects.filter(order=order).exists():
            raise serializers.ValidationError("You have already reviewed this order")
        
        return data
    
    def create(self, validated_data):
        """Create review with buyer from request"""
        validated_data['buyer'] = self.context['request'].user
        return super().create(validated_data)

