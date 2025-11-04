from rest_framework import serializers
from .models import Wishlist
from products.serializers import ProductListSerializer


class WishlistSerializer(serializers.ModelSerializer):
    """Serializer for wishlist items"""
    
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Wishlist
        fields = [
            'id', 'user', 'product', 'product_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def validate_product_id(self, value):
        """Ensure product exists"""
        from products.models import Product
        try:
            Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product does not exist")
        return value
    
    def create(self, validated_data):
        """Create wishlist item with user from request"""
        product_id = validated_data.pop('product_id', None)
        if product_id:
            from products.models import Product
            validated_data['product'] = Product.objects.get(id=product_id)
        
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class WishlistCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating wishlist items"""
    
    product_id = serializers.IntegerField()
    
    class Meta:
        model = Wishlist
        fields = ['product_id']
    
    def validate_product_id(self, value):
        """Ensure product exists"""
        from products.models import Product
        try:
            product = Product.objects.get(id=value)
            # Check if already in wishlist
            if Wishlist.objects.filter(
                user=self.context['request'].user,
                product=product
            ).exists():
                raise serializers.ValidationError("Product is already in your wishlist")
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product does not exist")
        return value
    
    def create(self, validated_data):
        """Create wishlist item"""
        from products.models import Product
        product = Product.objects.get(id=validated_data['product_id'])
        
        return Wishlist.objects.create(
            user=self.context['request'].user,
            product=product
        )

