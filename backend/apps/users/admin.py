from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from apps.users.models import User, SellerProfile, BuyerProfile, EmailVerificationToken
from apps.users.forms import CustomUserChangeForm, CustomUserCreationForm

# --- Inlines ---
# These allow you to edit related models directly on the User page.

class EmailVerificationTokenInline(admin.TabularInline):
    """
    Shows a user's verification tokens (e.g., to manually resend or see attempts).
    """
    model = EmailVerificationToken
    fk_name = 'user'
    extra = 0 # Don't show "add new" forms
    readonly_fields = ('purpose', 'target_email', 'attempt_count', 'created_at', 'expires_at', 'is_expired', 'is_verified')
    fields = ('purpose', 'target_email', 'attempt_count', 'is_verified', 'is_expired', 'created_at')
    can_delete = True
    verbose_name_plural = 'Email Verification Tokens'

class SellerProfileInline(admin.StackedInline):
    """
    Displays the SellerProfile model fields directly on the User admin page.
    """
    model = SellerProfile
    can_delete = False
    verbose_name_plural = 'Seller Profile'
    fk_name = 'user'
    fields = ('store_name', 'pickup_address', 'nid_number', 'picture')

class BuyerProfileInline(admin.StackedInline):
    """
    Displays the BuyerProfile model fields directly on the User admin page.
    """
    model = BuyerProfile
    can_delete = False
    verbose_name_plural = 'Buyer Profile'
    fk_name = 'user'
    fields = ('business_name', 'delivery_address', 'nid_number', 'picture')


# --- Main User Admin ---

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    This is the full, production-grade admin for your Custom User.
    It conditionally displays the correct profile inline based on the user's role.
    """
    # 1. Use our custom forms
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    # 2. Define the main list view
    list_display = (
        'email', 
        'get_full_name', 
        'role', 
        'is_email_verified',
        'is_profile_completed',
        'is_admin_verified',
        'is_active',
        'date_joined'
    )
    list_filter = (
        'role',
        'is_active',
        'is_email_verified',
        'is_profile_completed',
        'is_admin_verified',
        'is_staff', 
        'is_superuser', 
        'date_joined'
    )
    
    # 3. Define search fields
    search_fields = (
        'email', 
        'first_name', 
        'last_name', 
        'phone_number'
    )
    
    # 4. Set default ordering
    ordering = ('-date_joined',)

    # 5. Define the "Edit User" page layout (fieldsets)
    # We override the default fieldsets to match our model
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal Info'), {'fields': ('first_name', 'last_name', 'phone_number')}),
        (_('Status & Role'), {
            'fields': (
                'role',
                'is_active',
                'is_email_verified', 
                'email_verified_at',
                'is_profile_completed',
                'is_admin_verified'
            )
        }),
        (_('Permissions'), {
            'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        (_('Important Dates'), {'fields': ('last_login', 'date_joined')}),
    )

    # 6. Define the "Add User" page layout (add_fieldsets)
    # This must align with your CustomUserCreationForm
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 
                'first_name', 
                'last_name', 
                'role',
                'password_confirm' # This 'password_confirm' must match the form
            ),
        }),
    )
    
    # 7. Define read-only fields for the "Edit" page
    readonly_fields = ('last_login', 'date_joined', 'email_verified_at')
    
    # 8. Define Custom Admin Actions
    actions = ['mark_as_admin_verified', 'mark_as_admin_unverified']

    def get_inlines(self, request, obj=None):
        """
        Conditionally show the correct profile inline based on the user's role.
        """
        if obj is None:
            # No inlines on the "Add user" page
            return (EmailVerificationTokenInline,) 
        
        # On the "Edit user" page, check the role
        if obj.role == User.RoleChoices.SELLER:
            return (SellerProfileInline, EmailVerificationTokenInline)
        elif obj.role == User.RoleChoices.BUYER:
            return (BuyerProfileInline, EmailVerificationTokenInline)
        
        # For Admins or other roles, just show the tokens
        return (EmailVerificationTokenInline,)

    def get_form(self, request, obj=None, **kwargs):
        """
        Use special form for user creation
        """
        defaults = {}
        if obj is None:
            defaults['form'] = self.add_form
        defaults.update(kwargs)
        return super().get_form(request, obj, **defaults)
    
    # --- Custom Action Methods ---
    
    @admin.action(description='Mark selected users as ADMIN VERIFIED')
    def mark_as_admin_verified(self, request, queryset):
        updated_count = queryset.update(is_admin_verified=True)
        self.message_user(request, f'{updated_count} users were marked as admin verified.', messages.SUCCESS)

    @admin.action(description='Mark selected users as ADMIN UNVERIFIED')
    def mark_as_admin_unverified(self, request, queryset):
        updated_count = queryset.update(is_admin_verified=False)
        self.message_user(request, f'{updated_count} users were marked as admin unverified.', messages.WARNING)


# --- Register Other Models (Standalone) ---
# We also register the profiles separately for a top-level view.

@admin.register(SellerProfile)
class SellerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'store_name', 'nid_number')
    search_fields = ('user__email', 'store_name', 'nid_number')

@admin.register(BuyerProfile)
class BuyerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'business_name', 'nid_number')
    search_fields = ('user__email', 'business_name', 'nid_number')

@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ('target_email', 'user', 'purpose', 'is_verified', 'is_expired', 'created_at')
    list_filter = ('purpose', 'is_verified', 'created_at')
    search_fields = ('target_email', 'user__email')
