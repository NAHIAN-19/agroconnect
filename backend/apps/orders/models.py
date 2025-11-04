from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.users.models import User
from apps.products.models import Product


class Order(models.Model):
    """
    Order model for handling customer orders with SSLCommerz payment integration
    and RedX shipping integration.
    """
    
    # Order Status Choices
    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PAID = 'paid', 'Paid'
        PROCESSING = 'processing', 'Processing'
        SHIPPED = 'shipped', 'Shipped'
        DELIVERED = 'delivered', 'Delivered'
        CANCELLED = 'cancelled', 'Cancelled'
        REFUNDED = 'refunded', 'Refunded'
    
    # Keep constants for backwards compatibility
    STATUS_PENDING = StatusChoices.PENDING
    STATUS_PAID = StatusChoices.PAID
    STATUS_PROCESSING = StatusChoices.PROCESSING
    STATUS_SHIPPED = StatusChoices.SHIPPED
    STATUS_DELIVERED = StatusChoices.DELIVERED
    STATUS_CANCELLED = StatusChoices.CANCELLED
    STATUS_REFUNDED = StatusChoices.REFUNDED
    
    STATUS_CHOICES = StatusChoices.choices
    
    # Payment Method Choices
    PAYMENT_METHOD_SSLCOMMERZ = 'sslcommerz'
    PAYMENT_METHOD_CASH_ON_DELIVERY = 'cod'
    
    PAYMENT_METHOD_CHOICES = [
        (PAYMENT_METHOD_SSLCOMMERZ, 'SSLCommerz'),
        (PAYMENT_METHOD_CASH_ON_DELIVERY, 'Cash on Delivery'),
    ]
    
    # Order Basic Information
    order_number = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        help_text="Unique order number (e.g., ORD-20240115-001)"
    )
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='buyer_orders',
        limit_choices_to={'role': 'BUYER'},
        help_text="Buyer who placed the order"
    )
    
    # Order Items - multiple products can be in one order
    # Access via order.order_items.all()
    
    # Amounts
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Subtotal amount (sum of all items)"
    )
    delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=50.00,
        validators=[MinValueValidator(0)],
        help_text="Delivery fee (RedX shipping cost)"
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Total amount (subtotal + delivery_fee)"
    )
    
    # Order Status
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        help_text="Current order status"
    )
    
    # Payment Information (SSLCommerz)
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default=PAYMENT_METHOD_SSLCOMMERZ,
        help_text="Payment method used"
    )
    payment_status = models.CharField(
        max_length=20,
        default='pending',
        help_text="Payment status: pending, success, failed, cancelled"
    )
    sslcommerz_session_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="SSLCommerz session key for this transaction"
    )
    sslcommerz_tran_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        unique=True,
        help_text="SSLCommerz transaction ID"
    )
    sslcommerz_val_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="SSLCommerz validation ID (after payment success)"
    )
    payment_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when payment was completed"
    )
    
    # Shipping Information (RedX)
    recipient_name = models.CharField(
        max_length=100,
        help_text="Recipient's full name"
    )
    recipient_phone = models.CharField(
        max_length=20,
        help_text="Recipient's phone number"
    )
    recipient_address = models.TextField(
        help_text="Complete delivery address"
    )
    recipient_city = models.CharField(
        max_length=50,
        default='Dhaka',
        help_text="Recipient's city"
    )
    recipient_area = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Recipient's area/zone"
    )
    recipient_postcode = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Postal/ZIP code"
    )
    
    # RedX Shipping Information
    redx_order_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        unique=True,
        help_text="RedX order/tracking ID"
    )
    redx_tracking_number = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        unique=True,
        help_text="RedX tracking number"
    )
    shipping_status = models.CharField(
        max_length=50,
        default='pending',
        help_text="Shipping status from RedX: pending, picked_up, in_transit, delivered"
    )
    shipped_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when order was shipped"
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time when order was delivered"
    )
    
    # Additional Notes
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Additional notes for the order"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['buyer']),
            models.Index(fields=['status']),
            models.Index(fields=['order_number']),
            models.Index(fields=['sslcommerz_tran_id']),
            models.Index(fields=['redx_tracking_number']),
        ]
    
    def __str__(self):
        return f"{self.order_number} - {self.buyer.email}"
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate unique order number: ORD-YYYYMMDD-XXX
            today = timezone.now().date()
            date_str = today.strftime('%Y%m%d')
            last_order = Order.objects.filter(
                order_number__startswith=f'ORD-{date_str}-'
            ).order_by('-order_number').first()
            
            if last_order:
                last_num = int(last_order.order_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.order_number = f'ORD-{date_str}-{new_num:03d}'
        
        # Auto-calculate total if not set
        if not self.total_amount:
            self.total_amount = self.subtotal + self.delivery_fee
        
        super().save(*args, **kwargs)
    
    @property
    def seller_ids(self):
        """Returns list of unique seller IDs for products in this order"""
        return list(self.order_items.values_list('product__seller_id', flat=True).distinct())
    
    @property
    def buyer_name(self):
        """Returns buyer's business name or full name - matches frontend expectation"""
        if self.buyer:
            try:
                if hasattr(self.buyer, 'buyer_profile') and self.buyer.buyer_profile:
                    return self.buyer.buyer_profile.business_name or self.buyer.get_full_name()
            except (AttributeError, ValueError):
                pass
            return self.buyer.get_full_name()
        return None


class OrderReview(models.Model):
    """
    Review model for orders.
    Buyers can review their delivered orders (one review per order).
    Reviews can only be created after a certain time period (e.g., 1 month) after delivery.
    """
    
    # Rating and Comment
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5"
    )
    comment = models.TextField(
        blank=True,
        help_text="Review comment/feedback"
    )
    
    # Relationships
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='order_review',
        help_text="Order being reviewed"
    )
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='order_reviews',
        limit_choices_to={'role': 'BUYER'},
        help_text="Buyer who wrote the review"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['buyer']),
            models.Index(fields=['rating']),
        ]
        verbose_name = 'Order Review'
        verbose_name_plural = 'Order Reviews'
    
    def __str__(self):
        return f"{self.buyer.email} - Order {self.order.order_number} - {self.rating} stars"
    
    @property
    def buyer_name(self):
        """Get buyer's full name or email"""
        if self.buyer:
            return self.buyer.full_name or self.buyer.email
        return 'Anonymous'
    
    @property
    def buyer_avatar(self):
        """Get buyer's avatar URL"""
        if self.buyer and hasattr(self.buyer, 'buyer_profile') and self.buyer.buyer_profile:
            return self.buyer.buyer_profile.picture or self.buyer.avatar_url
        return self.buyer.avatar_url if self.buyer else None
    
    def can_review(self, min_days_after_delivery=30):
        """
        Check if order can be reviewed.
        Requires order to be delivered and at least min_days_after_delivery days since delivery.
        Default: 30 days (1 month)
        """
        if not self.order.delivered_at:
            return False, "Order has not been delivered yet"
        
        from django.utils import timezone
        from datetime import timedelta
        
        days_since_delivery = (timezone.now() - self.order.delivered_at).days
        if days_since_delivery < min_days_after_delivery:
            remaining_days = min_days_after_delivery - days_since_delivery
            return False, f"You can review this order in {remaining_days} day(s)"
        
        return True, "Order can be reviewed"


class OrderItem(models.Model):
    """
    OrderItem model representing individual products in an order.
    One order can have multiple items from different sellers.
    """
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='order_items',
        help_text="Order this item belongs to"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='order_items',
        help_text="Product being ordered"
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Quantity ordered"
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Price per unit at time of order (snapshot)"
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Total price for this item (quantity * unit_price)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['product']),
        ]
    
    def __str__(self):
        return f"{self.order.order_number} - {self.product.name} x{self.quantity}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate total_price if not set
        if not self.total_price:
            self.total_price = self.quantity * self.unit_price
        
        super().save(*args, **kwargs)
    
    @property
    def seller_id(self):
        """Returns seller ID - matches frontend expectation"""
        return self.product.seller_id if self.product else None
    
    @property
    def seller_name(self):
        """Returns seller name - matches frontend expectation"""
        return self.product.seller_name if self.product else None
    
    @property
    def product_name(self):
        """Returns product name - matches frontend expectation"""
        return self.product.name if self.product else None
    
    @property
    def product_image(self):
        """Returns product image URL - matches frontend expectation"""
        return self.product.image if self.product else None

