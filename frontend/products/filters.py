import django_filters
from django.db import models
from .models import Product, Review


class ProductFilter(django_filters.FilterSet):
    """
    FilterSet for Product model.
    Supports filtering by category, price range, stock, and search.
    """
    # Category filter (exact match or multiple)
    category = django_filters.CharFilter(field_name='category', lookup_expr='iexact')
    categories = django_filters.CharFilter(method='filter_categories')

    # Price range filters
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')

    # Stock filters
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    low_stock = django_filters.BooleanFilter(method='filter_low_stock')

    # Status filters
    verified = django_filters.BooleanFilter(field_name='verified')
    is_active = django_filters.BooleanFilter(field_name='is_active')

    # Seller filter
    seller = django_filters.NumberFilter(field_name='seller__id')
    seller_id = django_filters.NumberFilter(field_name='seller__id')

    # Search filter (name and description)
    search = django_filters.CharFilter(method='filter_search')

    # Ordering
    ordering = django_filters.OrderingFilter(
        fields=(
            ('created_at', 'created_at'),
            ('price', 'price'),
            ('stock', 'stock'),
            ('name', 'name'),
        ),
        field_labels={
            'created_at': 'Date Created',
            'price': 'Price',
            'stock': 'Stock',
            'name': 'Name',
        }
    )

    class Meta:
        model = Product
        fields = ['category', 'verified', 'is_active', 'seller']

    def filter_categories(self, queryset, name, value):
        """Filter by multiple categories (comma-separated)"""
        if value:
            categories = [cat.strip() for cat in value.split(',')]
            return queryset.filter(category__in=categories)
        return queryset

    def filter_in_stock(self, queryset, name, value):
        """Filter products that are in stock"""
        if value:
            return queryset.filter(stock__gt=0)
        return queryset.filter(stock=0)

    def filter_low_stock(self, queryset, name, value):
        """Filter products with low stock (<= 10)"""
        if value:
            return queryset.filter(stock__gt=0, stock__lte=10)
        return queryset

    def filter_search(self, queryset, name, value):
        """Search in product name and description"""
        if value:
            return queryset.filter(
                models.Q(name__icontains=value) |
                models.Q(description__icontains=value)
            )
        return queryset


class ReviewFilter(django_filters.FilterSet):
    """
    FilterSet for Review model.
    Supports filtering by product, buyer, rating, and seller.
    """
    # Product filter
    product = django_filters.NumberFilter(field_name='product__id')
    product_id = django_filters.NumberFilter(field_name='product__id')

    # Buyer filter
    buyer = django_filters.NumberFilter(field_name='buyer__id')
    buyer_id = django_filters.NumberFilter(field_name='buyer__id')

    # Seller filter (reviews for seller's products)
    seller = django_filters.NumberFilter(field_name='product__seller__id')
    seller_id = django_filters.NumberFilter(field_name='product__seller__id')

    # Rating filter
    rating = django_filters.NumberFilter(field_name='rating')
    min_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')
    max_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='lte')

    # Ordering
    ordering = django_filters.OrderingFilter(
        fields=(
            ('created_at', 'created_at'),
            ('rating', 'rating'),
        ),
        field_labels={
            'created_at': 'Date Created',
            'rating': 'Rating',
        }
    )

    class Meta:
        model = Review
        fields = ['product', 'buyer', 'rating', 'seller']

