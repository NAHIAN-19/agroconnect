from datetime import timedelta

import urllib.parse
from django.contrib.auth.models import AbstractUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.users.managers import CustomUserManager
from apps.users.managers import EmailVerificationTokenManager


class User(AbstractUser, PermissionsMixin):
    class RoleChoices(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        SELLER = "SELLER", "Seller"
        BUYER = "BUYER", "Buyer"

    username = None  # We use email as the unique identifier
    email = models.EmailField(unique=True, blank=False, null=False, db_index=True)
    first_name = models.CharField(max_length=30, null=False, blank=False)
    last_name = models.CharField(max_length=30, null=True, blank=True)
    
    role = models.CharField(
        max_length=10, 
        choices=RoleChoices.choices, 
        default=RoleChoices.BUYER,
        db_index=True # Indexed for faster role-based filtering
    )
    
    phone_number = models.CharField(
        max_length=20, 
        unique=True, 
        null=True, 
        blank=True,
        db_index=True # Indexed for faster lookups
    )

    # --- Verification & Status Flags ---
    
    # 1. Email Verification (Done by user via OTP)
    is_email_verified = models.BooleanField(default=False, db_index=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    
    # 2. Profile Completion (Done by user filling the form)
    is_profile_completed = models.BooleanField(default=False, db_index=True)

    # 3. Admin Approval (Done by an Admin in the Django panel)
    is_admin_verified = models.BooleanField(default=False, db_index=True)

    # --- Standard Django Fields ---
    is_staff = models.BooleanField(default=False)
    # is_active = False means the user must verify their email to log in
    is_active = models.BooleanField(default=False) 
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_seen = models.DateTimeField(null=True, blank=True)

    # For "change email" requests
    pending_email = models.EmailField(null=True, blank=True)

    # Fix related_name clashes with default User
    groups = models.ManyToManyField('auth.Group', related_name='custom_user_groups', blank=True)
    user_permissions = models.ManyToManyField('auth.Permission', related_name='custom_user_permissions', blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name"]

    objects = CustomUserManager()


    @property
    def avatar_url(self) -> str:
        """
        Returns a single, reliable URL for the user's avatar.
        1. Tries to find a user-uploaded picture.
        2. If none, generates a themed avatar from ui-avatars.com.
        """
        uploaded_picture = None
        try:
            # Check for a profile and a picture on that profile
            if self.role == self.RoleChoices.SELLER and hasattr(self, 'seller_profile'):
                uploaded_picture = self.seller_profile.picture
            elif self.role == self.RoleChoices.BUYER and hasattr(self, 'buyer_profile'):
                uploaded_picture = self.buyer_profile.picture
        
        except (AttributeError): 
            # This can happen if the profile object itself is None
            pass
        except Exception:
            # Broad catch in case profiles aren't defined yet
            pass

        # 1. Return the real picture if it exists
        if uploaded_picture:
            return uploaded_picture

        # 2. Generate a UI Avatars URL as a fallback
        name = self.get_full_name()
        if not name.strip():
            # Fallback for users with no name (e.g., just after signup)
            name = self.email[0] 
            
        # URL-encode the name (e.g., "Abdul Karim" -> "Abdul+Karim")
        name_encoded = urllib.parse.quote_plus(name)

        # Use our "Farm Fresh" theme colors
        # background = 10B981 (Primary Green)
        # color = FFFFFF (White)
        return f"https://ui-avatars.com/api/?name={name_encoded}&background=10B981&color=FFFFFF&bold=true"
    
    def __str__(self) -> str:
        return f"{self.email} ({self.role})"

    def get_full_name(self) -> str:
        last_name = self.last_name if self.last_name else ""
        return f"{self.first_name} {last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name

    # --- Properties (Fixed) ---
    @property
    def is_buyer(self) -> bool:
        return self.role == self.RoleChoices.BUYER

    @property
    def is_seller(self) -> bool:  # <-- Fixed typo from is_buyer
        return self.role == self.RoleChoices.SELLER
    
    @property
    def is_admin_user(self) -> bool:
        return self.role == self.RoleChoices.ADMIN

    # --- Actions ---
    def mark_email_as_verified(self) -> None:
        """Activates the user's account once their email is verified."""
        self.is_email_verified = True
        self.email_verified_at = timezone.now()
        self.is_active = True # User can now log in
        self.save(update_fields=["is_email_verified", "email_verified_at", "is_active"])

    def mark_profile_as_completed(self) -> None:
        """Marks the user as having filled out their role-specific profile."""
        self.is_profile_completed = True
        self.save(update_fields=["is_profile_completed"])
        
    def mark_as_admin_verified(self) -> None:
        """Marks the user as approved by a site administrator."""
        self.is_admin_verified = True
        self.save(update_fields=["is_admin_verified"])

class EmailVerificationToken(models.Model):
    """
    Stores a secure, one-time-use, hashed token for verifying email addresses.
    Used for both new user registration and email address changes.
    """
    MAX_ATTEMPTS = 5 # Max attempts before this code is invalidated

    class PurposeChoices(models.TextChoices):
        REGISTRATION = "REGISTRATION", "New User Registration"
        EMAIL_CHANGE = "EMAIL_CHANGE", "Email Address Change"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_verifications")
    
    # Store the HASH of the 6-digit code
    code_hash = models.CharField(max_length=128)
    
    purpose = models.CharField(max_length=20, choices=PurposeChoices.choices)
    
    # The email address this token was sent to
    target_email = models.EmailField()

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    
    # Track verification attempts for security
    attempt_count = models.PositiveSmallIntegerField(default=0)

    objects = EmailVerificationTokenManager()

    class Meta:
        indexes = [
            models.Index(fields=["user", "purpose"]),
            models.Index(fields=["expires_at"]),
        ]
        verbose_name = "Email Verification Token"
        verbose_name_plural = "Email Verification Tokens"

    def __str__(self):
        return f"{self.purpose} Token for {self.user.email}"

    @property
    def is_expired(self) -> bool:
        """Check if the token has expired."""
        
        # --- FIX ---
        # First, check if expires_at is even set.
        # If it's not set (it's None), we can't compare it.
        # We'll treat it as expired by default.
        if not self.expires_at:
            return True 
            
        # If it is set, *then* do the comparison.
        return timezone.now() > self.expires_at
    
class SellerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='seller_profile')
    store_name = models.CharField(max_length=100)
    pickup_address = models.TextField()
    nid_number = models.CharField(max_length=20, unique=True)
    picture= models.URLField(max_length=500, blank=True, null=True)

    def __str__(self):
        return f"Seller Profile for {self.user.email}"


class BuyerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='buyer_profile')
    business_name = models.CharField(max_length=100)
    delivery_address = models.TextField()
    nid_number = models.CharField(max_length=20, unique=True)
    picture= models.URLField(max_length=500, blank=True, null=True)

    def __str__(self):
        return f"Buyer Profile for {self.user.email}"