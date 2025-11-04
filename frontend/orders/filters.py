from django_filters import rest_framework as filters
from .models import Order


class OrderFilter(filters.FilterSet):
    """FilterSet for Order model with django-filter"""
    
    # Status filters
    status = filters.ChoiceFilter(choices=Order.STATUS_CHOICES)
    payment_status = filters.CharFilter(lookup_expr='iexact')
    shipping_status = filters.CharFilter(lookup_expr='iexact')
    
    # Date filters
    created_after = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    delivered_after = filters.DateTimeFilter(field_name='delivered_at', lookup_expr='gte')
    delivered_before = filters.DateTimeFilter(field_name='delivered_at', lookup_expr='lte')
    
    # Amount filters
    min_amount = filters.NumberFilter(field_name='total_amount', lookup_expr='gte')
    max_amount = filters.NumberFilter(field_name='total_amount', lookup_expr='lte')
    
    # Payment method
    payment_method = filters.ChoiceFilter(choices=Order.PAYMENT_METHOD_CHOICES)
    
    # Search
    order_number = filters.CharFilter(lookup_expr='icontains')
    recipient_name = filters.CharFilter(lookup_expr='icontains')
    recipient_phone = filters.CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = Order
        fields = [
            'status', 'payment_status', 'shipping_status',
            'payment_method', 'order_number', 'recipient_name', 'recipient_phone'
        ]

