from django.contrib import admin
from .models import Order, OrderItem, OrderReview


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'buyer', 'status', 'payment_status', 
        'total_amount', 'created_at', 'redx_tracking_number'
    ]
    list_filter = ['status', 'payment_status', 'payment_method', 'created_at']
    search_fields = ['order_number', 'buyer__email', 'buyer__first_name', 'buyer__last_name', 
                     'sslcommerz_tran_id', 'redx_tracking_number']
    readonly_fields = ['order_number', 'created_at', 'updated_at']
    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'buyer', 'status', 'notes')
        }),
        ('Amounts', {
            'fields': ('subtotal', 'delivery_fee', 'total_amount')
        }),
        ('Payment Information (SSLCommerz)', {
            'fields': (
                'payment_method', 'payment_status', 'sslcommerz_session_key',
                'sslcommerz_tran_id', 'sslcommerz_val_id', 'payment_date'
            )
        }),
        ('Shipping Information (RedX)', {
            'fields': (
                'recipient_name', 'recipient_phone', 'recipient_address',
                'recipient_city', 'recipient_area', 'recipient_postcode',
                'redx_order_id', 'redx_tracking_number', 'shipping_status',
                'shipped_at', 'delivered_at'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'unit_price', 'total_price', 'created_at']
    list_filter = ['created_at']
    search_fields = ['order__order_number', 'product__name']
    readonly_fields = ['created_at']


@admin.register(OrderReview)
class OrderReviewAdmin(admin.ModelAdmin):
    list_display = ['order', 'buyer', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['order__order_number', 'buyer__email', 'comment']
    readonly_fields = ['created_at', 'updated_at']

