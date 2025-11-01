from rest_framework import viewsets, permissions
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import Product, Order
from .serializers import ProductSerializer, OrderSerializer
from .permissions import IsFarmer, IsBuyer


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsFarmer]

    def get_queryset(self):
        # Farmers can only see and manage their own products
        return Product.objects.filter(farmer=self.request.user).select_related('farmer')

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

    @method_decorator(cache_page(60 * 5)) # Cache for 5 minutes
    def list(self, request, *args, **kwargs):
        from rest_framework.response import Response
        # Public list view for all products, overriding the queryset for buyers
        queryset = Product.objects.all().select_related('farmer')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsBuyer]

    def get_queryset(self):
        # Buyers see their orders, Farmers see orders for their products
        user = self.request.user
        if user.role == 'BUYER':
            return Order.objects.filter(buyer=user).prefetch_related('items__product')
        elif user.role == 'FARMER':
            return Order.objects.filter(items__product__farmer=user).distinct().prefetch_related('items__product')
        return Order.objects.none()

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)
