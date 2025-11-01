from rest_framework import serializers
from .models import Product, Order, OrderItem
from app.accounts.models import User


class ProductSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.get_full_name', read_only=True)

    class Meta:
        model = Product
        fields = ('id', 'name', 'description', 'price', 'stock', 'farmer_name')


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = OrderItem
        fields = ('product', 'quantity')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    buyer_name = serializers.CharField(source='buyer.get_full_name', read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'buyer_name', 'created_at', 'status', 'total_price', 'items')

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        total_price = 0
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            total_price += product.price * quantity
            OrderItem.objects.create(order=order, product=product, quantity=quantity)
        order.total_price = total_price
        order.save()
        return order
