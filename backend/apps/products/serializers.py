from rest_framework import serializers
from django.db import transaction
from apps.products.models import Product, Review
from django.contrib.auth import get_user_model

User = get_user_model()


class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for product listings (optimized for lists).
    Includes only essential fields for marketplace display.
    """
    seller_id = serializers.IntegerField(source='seller.id', read_only=True)
    farmer_id = serializers.IntegerField(source='seller.id', read_only=True)
    farmer_name = serializers.CharField(read_only=True)
    seller_name = serializers.CharField(read_only=True)
    rating = serializers.FloatField(read_only=True)
    reviews = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'price',
            'stock',
            'unit',
            'category',
            'image',
            'verified',
            'seller_id',
            'farmer_id',
            'farmer_name',
            'seller_name',
            'rating',
            'reviews',
            'created_at',
        ]
        read_only_fields = ['created_at', 'rating', 'reviews', 'verified']


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for single product view.
    Includes all fields and computed properties.
    """
    seller_id = serializers.IntegerField(source='seller.id', read_only=True)
    farmer_id = serializers.IntegerField(source='seller.id', read_only=True)
    farmer_name = serializers.CharField(read_only=True)
    seller_name = serializers.CharField(read_only=True)
    rating = serializers.FloatField(read_only=True)
    reviews = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'price',
            'stock',
            'unit',
            'category',
            'image',
            'verified',
            'is_active',
            'seller_id',
            'farmer_id',
            'farmer_name',
            'seller_name',
            'rating',
            'reviews',
            'is_low_stock',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'rating',
            'reviews',
            'verified',
            'seller_id',
            'farmer_id',
            'farmer_name',
            'seller_name',
            'is_low_stock',
        ]


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating products.
    Used by sellers to manage their products.
    """
    class Meta:
        model = Product
        fields = [
            'name',
            'description',
            'price',
            'stock',
            'unit',
            'category',
            'image',
            'is_active',
        ]

    def validate_price(self, value):
        """Ensure price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_stock(self, value):
        """Ensure stock is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for product reviews.
    Includes buyer name and avatar for frontend display.
    """
    buyer_name = serializers.CharField(read_only=True)
    buyer_avatar = serializers.URLField(read_only=True)
    product_name = serializers.CharField(read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'product_id',
            'product_name',
            'buyer',
            'buyer_name',
            'buyer_avatar',
            'rating',
            'comment',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'buyer_name',
            'buyer_avatar',
            'product_name',
            'product_id',
            'created_at',
            'updated_at',
        ]

    def validate_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        """Ensure buyer is a BUYER role user"""
        buyer = self.context['request'].user if 'request' in self.context else None
        if buyer and buyer.role != User.RoleChoices.BUYER:
            raise serializers.ValidationError(
                {"buyer": "Only buyers can write reviews."}
            )
        return attrs


class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating reviews.
    Automatically sets buyer from request user.
    """
    class Meta:
        model = Review
        fields = ['product', 'rating', 'comment']

    def validate_rating(self, value):
        """Ensure rating is between 1 and 5"""
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def create(self, validated_data):
        """Create review with buyer from request user"""
        buyer = self.context['request'].user
        validated_data['buyer'] = buyer
        return super().create(validated_data)

