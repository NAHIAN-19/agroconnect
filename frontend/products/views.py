from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import Q

from utils.response import APIResponse
from .models import Product, Review
from .serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    ReviewSerializer,
    ReviewCreateSerializer,
)
from .filters import ProductFilter, ReviewFilter
from .pagination import StandardResultsSetPagination
from .permissions import IsSellerOrReadOnly, IsBuyerOrReadOnly, IsSellerOwner


def invalidate_product_caches():
    """
    Invalidate all product-related caches.
    For Redis, we need to use a different approach since delete_pattern may not be available.
    """
    try:
        # Try Redis pattern deletion if available (django-redis)
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern('products:*')
            cache.delete_pattern('product:*')
        else:
            # For standard cache backends, we can't delete by pattern
            # The cache will expire naturally based on TTL
            pass
    except Exception:
        # Fallback: Let cache expire naturally
        pass


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product model.
    
    list: Get all products (with filtering, search, pagination)
    retrieve: Get single product detail
    create: Create new product (seller only)
    update: Update product (owner only)
    partial_update: Partially update product (owner only)
    destroy: Delete product (owner only)
    seller: Get current seller's products
    """
    queryset = Product.objects.filter(is_active=True).select_related('seller', 'seller__seller_profile')
    permission_classes = [IsSellerOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'category']
    ordering_fields = ['created_at', 'price', 'stock', 'name']
    ordering = ['-created_at']
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ProductListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer

    def get_queryset(self):
        """Optimize queryset with select_related and prefetch_related"""
        queryset = super().get_queryset()
        
        # Filter out inactive products for list/detail views (unless owner)
        if self.action in ['list', 'retrieve']:
            # Allow inactive products only if user is the owner
            if not self.request.user.is_authenticated or self.request.user.role != 'SELLER':
                queryset = queryset.filter(is_active=True)
            else:
                # Sellers can see their own inactive products
                queryset = queryset.filter(
                    Q(is_active=True) | Q(seller=self.request.user)
                )
        
        # Prefetch reviews for rating calculation
        queryset = queryset.prefetch_related('review_set')
        
        return queryset

    def get_cache_key(self, request):
        """Generate cache key based on request parameters"""
        cache_params = {
            'action': self.action,
            'page': request.query_params.get('page', 1),
            'page_size': request.query_params.get('page_size', self.pagination_class.page_size),
            'search': request.query_params.get('search', ''),
            'category': request.query_params.get('category', ''),
            'min_price': request.query_params.get('min_price', ''),
            'max_price': request.query_params.get('max_price', ''),
            'ordering': request.query_params.get('ordering', ''),
        }
        # Create hash from params
        import hashlib
        import json
        cache_str = json.dumps(cache_params, sort_keys=True)
        cache_hash = hashlib.md5(cache_str.encode()).hexdigest()
        return f"products:{cache_hash}"

    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    def list(self, request, *args, **kwargs):
        """List all products with caching"""
        cache_key = self.get_cache_key(request)
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return APIResponse.success(
                message="Products retrieved successfully",
                data=cached_data,
            )
        
        response = super().list(request, *args, **kwargs)
        
        # Cache the response data
        if response.status_code == 200:
            cache.set(cache_key, response.data, 60 * 5)  # Cache for 5 minutes
        
        return APIResponse.success(
            message="Products retrieved successfully",
            data=response.data,
        )

    def retrieve(self, request, *args, **kwargs):
        """Get single product detail with caching"""
        instance = self.get_object()
        cache_key = f"product:{instance.id}:{request.user.id if request.user.is_authenticated else 'anon'}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return APIResponse.success(
                message="Product retrieved successfully",
                data=cached_data,
            )
        
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Cache the response data
        cache.set(cache_key, data, 60 * 10)  # Cache for 10 minutes
        
        return APIResponse.success(
            message="Product retrieved successfully",
            data=data,
        )

    def create(self, request, *args, **kwargs):
        """Create new product (seller only)"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Set seller from request user and verified status
            product = serializer.save(
                seller=request.user,
                verified=request.user.is_admin_verified,  # Mirror seller's verification
            )
            
            # Invalidate product list cache
            invalidate_product_caches()
            
            response_serializer = ProductDetailSerializer(product)
            return APIResponse.success(
                message="Product created successfully",
                data=response_serializer.data,
                status_code=status.HTTP_201_CREATED,
            )
        return APIResponse.validation_error(serializer.errors)

    def update(self, request, *args, **kwargs):
        """Update product (owner only)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            product = serializer.save()
            
            # Invalidate caches
            invalidate_product_caches()
            
            response_serializer = ProductDetailSerializer(product)
            return APIResponse.success(
                message="Product updated successfully",
                data=response_serializer.data,
            )
        return APIResponse.validation_error(serializer.errors)

    def destroy(self, request, *args, **kwargs):
        """Delete product (owner only)"""
        instance = self.get_object()
        product_id = instance.id
        instance.delete()
        
        # Invalidate caches
        invalidate_product_caches()
        
        return APIResponse.success(
            message="Product deleted successfully",
            status_code=status.HTTP_204_NO_CONTENT,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsSellerOwner])
    def seller(self, request):
        """Get current seller's products"""
        queryset = self.filter_queryset(
            self.get_queryset().filter(seller=request.user)
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ProductListSerializer(queryset, many=True)
        return APIResponse.success(
            message="Your products retrieved successfully",
            data=serializer.data,
        )


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Review model.
    
    list: Get all reviews (with filtering)
    retrieve: Get single review detail
    create: Create new review (buyer only)
    update: Update review (owner only)
    partial_update: Partially update review (owner only)
    destroy: Delete review (owner only)
    seller: Get reviews for seller's products
    """
    queryset = Review.objects.select_related('product', 'buyer', 'buyer__buyer_profile', 'product__seller')
    permission_classes = [IsBuyerOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = ReviewFilter
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ReviewCreateSerializer
        return ReviewSerializer

    def create(self, request, *args, **kwargs):
        """Create new review (buyer only)"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            try:
                review = serializer.save()
                response_serializer = ReviewSerializer(review)
                
                # Invalidate product cache (rating may have changed)
                invalidate_product_caches()
                
                return APIResponse.success(
                    message="Review created successfully",
                    data=response_serializer.data,
                    status_code=status.HTTP_201_CREATED,
                )
            except Exception as e:
                # Handle unique constraint violation (one review per buyer per product)
                if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                    return APIResponse.error(
                        message="You have already reviewed this product",
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )
                return APIResponse.error(
                    message="Failed to create review",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
        return APIResponse.validation_error(serializer.errors)

    def update(self, request, *args, **kwargs):
        """Update review (owner only)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            review = serializer.save()
            
            # Invalidate product cache (rating may have changed)
            invalidate_product_caches()
            
            response_serializer = ReviewSerializer(review)
            return APIResponse.success(
                message="Review updated successfully",
                data=response_serializer.data,
            )
        return APIResponse.validation_error(serializer.errors)

    def destroy(self, request, *args, **kwargs):
        """Delete review (owner only)"""
        instance = self.get_object()
        product_id = instance.product.id
        instance.delete()
        
        # Invalidate product cache (rating may have changed)
        invalidate_product_caches()
        
        return APIResponse.success(
            message="Review deleted successfully",
            status_code=status.HTTP_204_NO_CONTENT,
        )

    @action(detail=False, methods=['get'])
    def seller(self, request):
        """Get reviews for current seller's products"""
        seller_id = request.user.id if request.user.is_authenticated and request.user.role == 'SELLER' else None
        
        if not seller_id:
            return APIResponse.forbidden("Only sellers can access their product reviews")
        
        queryset = self.filter_queryset(
            self.get_queryset().filter(product__seller_id=seller_id)
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ReviewSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ReviewSerializer(queryset, many=True)
        return APIResponse.success(
            message="Reviews for your products retrieved successfully",
            data=serializer.data,
        )

