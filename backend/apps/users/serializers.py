
# Django imports
from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.utils.translation import gettext_lazy as _

# Third-party imports
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import UntypedToken
from django.db import transaction

# App imports
from apps.users.models import User, BuyerProfile, SellerProfile


class TokenRefreshCookieSerializer(TokenRefreshSerializer):
    """
    A custom serializer for TokenRefreshView.
    This serializer reads the refresh token from the HttpOnly cookie
    instead of the request body.
    """
    refresh = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        # Read the cookie name from settings
        cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token')
        
        # Get the refresh token from the request cookies
        refresh_token = self.context['request'].COOKIES.get(cookie_name)
        if not refresh_token:
            raise InvalidToken("No refresh token found in cookies.")
            
        attrs['refresh'] = refresh_token
        return super().validate(attrs)


# User Registration Serializer
class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for new user registration.
    Handles data validation and password matching.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    first_name = serializers.CharField(required=True, max_length=255)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    phone_number = serializers.CharField(required=True, max_length=20)

    class Meta:
        model = User
        fields = ['email', 'phone_number', 'first_name', 'last_name', 'password', 'password_confirm']

    def validate_phone_number(self, value):
        """
        Check that no *active* user has this phone number.
        """
        # We only care about *active* users. An inactive user can re-register.
        if User.objects.filter(phone_number__iexact=value, is_active=True).exists():
            raise serializers.ValidationError("An active user with this phone number already exists.")
        return value

    def validate_email(self, value):
        # Normalize email
        value = value.lower()
        if User.objects.filter(email__iexact=value, is_active=True).exists():
            raise serializers.ValidationError("An active user with this email address already exists. Please log in or use a different email address.")
        return value

    def validate(self, attrs):
        """
        Check that the two password entries match.
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields don't match."})

        return attrs

    def create(self, validated_data):
        """
        Create a new, inactive user.
        The view will call this *only* if no inactive user was found.
        """
        # Remove password_confirm as create_user doesn't expect it
        validated_data.pop('password_confirm', None)

        user = User.objects.create_user(
            email=validated_data['email'],
            phone_number=validated_data['phone_number'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            is_active=False  # Explicitly set to False
        )

        return user


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for verifying the 6-digit code.
    """
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, max_length=8)

    def validate(self, attrs):
        if not attrs.get('email'):
            raise serializers.ValidationError("Email is required.")
        if not attrs.get('code'):
            raise serializers.ValidationError("Code is required.")
        
        # We don't verify the code here, the view will do that
        # using the manager method, which provides better error statuses.
        
        return attrs


class ResendVerificationSerializer(serializers.Serializer):
    """
    Validates the email for the "Resend Verification" endpoint.
    
    This is the "SOLID" part: its single responsibility is to
    validate the email and find the associated inactive user.
    """
    email = serializers.EmailField(required=True)
    user = serializers.HiddenField(default=None) # We'll populate this in validation

    def validate_email(self, value):
        email = value.lower()
        try:
            # We only care about users who are unverified
            user = User.objects.get(email=email, is_active=False)
        except User.DoesNotExist:
            raise serializers.ValidationError("No inactive user found with this email address.")
        
        # Store the found user object in the serializer's validated_data
        self.user = user
        return value

    def validate(self, attrs):
        # We assign the user we found to the 'user' key so the view can access it
        attrs['user'] = self.user
        return 
    
class BuyerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the BuyerProfile model.
    """
    # Make URLField optional as per your model
    picture = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = BuyerProfile
        fields = [
            'id', 
            'business_name', 
            'delivery_address', 
            'nid_number', 
            'picture'
        ]
        read_only_fields = ['id']


class SellerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the SellerProfile model.
    """
    picture = serializers.URLField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = SellerProfile
        fields = [
            'id', 
            'store_name', 
            'pickup_address', 
            'nid_number', 
            'picture'
        ]
        read_only_fields = ['id']

class OnboardingSerializer(serializers.Serializer):
    """
    Handles the main onboarding flow, validating and saving the
    user's role and the corresponding profile data in one transaction.
    """
    role = serializers.ChoiceField(choices=[User.RoleChoices.BUYER, User.RoleChoices.SELLER])
    buyer_profile = BuyerProfileSerializer(required=False)
    seller_profile = SellerProfileSerializer(required=False)

    def validate(self, attrs):
        """
        Ensure that the correct profile data is provided for the selected role,
        and REMOVE the profile data for the unused role.
        """
        role = attrs.get("role")
        
        # --- THIS IS THE FIX ---

        if role == User.RoleChoices.BUYER:
            # 1. Check if buyer_profile is present
            if not attrs.get("buyer_profile"):
                raise serializers.ValidationError({
                    "buyer_profile": "This field is required for the 'BUYER' role."
                })
            # 2. Remove seller_profile data if it was sent
            if "seller_profile" in attrs:
                attrs.pop("seller_profile")
                
        elif role == User.RoleChoices.SELLER:
            # 1. Check if seller_profile is present
            if not attrs.get("seller_profile"):
                raise serializers.ValidationError({
                    "seller_profile": "This field is required for the 'SELLER' role."
                })
            # 2. Remove buyer_profile data if it was sent
            if "buyer_profile" in attrs:
                attrs.pop("buyer_profile")
            
        return attrs

    def save(self, **kwargs):
        """
        Save the validated data in an atomic transaction.
        """
        user = self.context["request"].user
        role = self.validated_data["role"]
        
        with transaction.atomic():
            # 1. Update the User model
            user.role = role
            user.is_profile_completed = True
            user.save(update_fields=["role", "is_profile_completed"])


            # 2. Create or Update the corresponding profile
            if role == User.RoleChoices.BUYER:
                # We know "buyer_profile" exists because of our validate method
                profile_data = self.validated_data["buyer_profile"]
                profile, created = BuyerProfile.objects.get_or_create(user=user)
                
                for attr, value in profile_data.items():
                    setattr(profile, attr, value)
                profile.save()

            elif role == User.RoleChoices.SELLER:
                # We know "seller_profile" exists
                profile_data = self.validated_data["seller_profile"]
                profile, created = SellerProfile.objects.get_or_create(user=user)
                
                for attr, value in profile_data.items():
                    setattr(profile, attr, value)
                profile.save()

        return user
    
class MyProfileSerializer(serializers.ModelSerializer):
    """
    A read-only serializer for the /profile/my/ endpoint.
    It combines key User fields with the role-specific profile (Buyer or Seller).
    """
    # Get the user's full name from the model's @property
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    # Get the smart avatar URL from the model's @property
    avatar_url = serializers.CharField(read_only=True)
    
    # This field will dynamically nest the correct profile
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        # These are the fields that will be returned for the logged-in user
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'phone_number',
            'avatar_url',
            'is_email_verified',
            'is_profile_completed',
            'is_admin_verified',
            'profile',  # This will contain the nested profile object
        ]
        read_only_fields = fields # This serializer is read-only

    def get_profile(self, user_obj):
        """
        This method is called by SerializerMethodField().
        It checks the user's role and returns the
        serialized data for their *specific* profile.
        """
        if user_obj.role == User.RoleChoices.BUYER:
            if hasattr(user_obj, 'buyer_profile'):
                return BuyerProfileSerializer(user_obj.buyer_profile).data
        elif user_obj.role == User.RoleChoices.SELLER:
            if hasattr(user_obj, 'seller_profile'):
                return SellerProfileSerializer(user_obj.seller_profile).data
        
        # If user is ADMIN or profile doesn't exist yet
        return None
    

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Run Django’s built-in password validators (strongness, similarity, etc.)
        password_validation.validate_password(attrs['new_password'], self.context['request'].user)

        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user