from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from utils.response import APIResponse
from apps.wishlist.models import Wishlist
from apps.wishlist.serializers import WishlistSerializer, WishlistCreateSerializer
from apps.products.models import Product


class WishlistViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Wishlist model.
    
    list: Get current user's wishlist
    create: Add product to wishlist
    destroy: Remove product from wishlist
    """
    
    queryset = Wishlist.objects.select_related('user', 'product', 'product__seller').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['product__name', 'product__description']
    ordering_fields = ['created_at', 'product__name', 'product__price']
    ordering = ['-created_at']
    throttle_class = []
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return WishlistCreateSerializer
        return WishlistSerializer
    
    def get_queryset(self):
        """Filter queryset to only show current user's wishlist"""
        return self.queryset.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """List current user's wishlist items"""
        queryset = self.filter_queryset(self.get_queryset())
        
        serializer = self.get_serializer(queryset, many=True)
        return APIResponse.success(
            message="Wishlist retrieved successfully",
            data=serializer.data
        )
    
    def create(self, request, *args, **kwargs):
        """Add product to wishlist"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            wishlist_item = serializer.save()
            response_serializer = WishlistSerializer(wishlist_item, context={'request': request})
            return APIResponse.success(
                message="Product added to wishlist successfully",
                data=response_serializer.data,
                status_code=status.HTTP_201_CREATED
            )
        
        return APIResponse.error(
            message="Validation error",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    def destroy(self, request, *args, **kwargs):
        """Remove product from wishlist"""
        instance = self.get_object()
        
        # Verify ownership
        if instance.user != request.user:
            return APIResponse.error(
                message="You can only remove your own wishlist items",
                status_code=status.HTTP_403_FORBIDDEN
            )
        
        instance.delete()
        return APIResponse.success(
            message="Product removed from wishlist successfully"
        )
    
    @action(detail=False, methods=['post'], url_path='add')
    def add_product(self, request):
        """Alternative endpoint to add product to wishlist by product_id"""
        product_id = request.data.get('product_id')
        
        if not product_id:
            return APIResponse.error(
                message="product_id is required",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return APIResponse.error(
                message="Product does not exist",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already in wishlist
        if Wishlist.objects.filter(user=request.user, product=product).exists():
            return APIResponse.error(
                message="Product is already in your wishlist",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Create wishlist item
        wishlist_item = Wishlist.objects.create(user=request.user, product=product)
        serializer = WishlistSerializer(wishlist_item, context={'request': request})
        
        return APIResponse.success(
            message="Product added to wishlist successfully",
            data=serializer.data,
            status_code=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['delete'], url_path='remove')
    def remove_product(self, request):
        """Alternative endpoint to remove product from wishlist by product_id"""
        product_id = request.data.get('product_id')
        
        if not product_id:
            return APIResponse.error(
                message="product_id is required",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            wishlist_item = Wishlist.objects.get(user=request.user, product_id=product_id)
        except Wishlist.DoesNotExist:
            return APIResponse.error(
                message="Product is not in your wishlist",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        wishlist_item.delete()
        return APIResponse.success(
            message="Product removed from wishlist successfully"
        )
    

