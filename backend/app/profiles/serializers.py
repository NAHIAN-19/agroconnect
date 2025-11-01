from rest_framework import serializers
from .models import FarmerProfile, BuyerProfile
from app.accounts.models import User


class FarmerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerProfile
        fields = ('farm_name', 'pickup_address', 'nid_number')


class BuyerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        fields = ('business_name', 'delivery_address', 'nid_number')


class ProfileSetupSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.RoleChoices.choices)
    farmer_profile = FarmerProfileSerializer(required=False)
    buyer_profile = BuyerProfileSerializer(required=False)

    def validate(self, data):
        role = data.get('role')
        if role == User.RoleChoices.FARMER and 'farmer_profile' not in data:
            raise serializers.ValidationError("Farmer profile is required for the farmer role.")
        if role == User.RoleChoices.BUYER and 'buyer_profile' not in data:
            raise serializers.ValidationError("Buyer profile is required for the buyer role.")
        return data

    def create(self, validated_data):
        role = validated_data.get('role')
        user = self.context['request'].user
        user.role = role
        user.save()

        if role == User.RoleChoices.FARMER:
            profile_data = validated_data.get('farmer_profile')
            FarmerProfile.objects.create(user=user, **profile_data)
        elif role == User.RoleChoices.BUYER:
            profile_data = validated_data.get('buyer_profile')
            BuyerProfile.objects.create(user=user, **profile_data)

        return user
