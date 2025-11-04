from django import forms
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from apps.users.models import User # Import your User model

class CustomUserCreationForm(UserCreationForm):
    """
    A form for creating new users in the admin.
    Correctly handles the email-based user model.
    """
    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role")

    def save(self, commit=True):
        # We override save to use our custom create_user method
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.role = self.cleaned_data["role"]
        
        # Admin-created users are active and verified by default
        user.is_active = True
        user.is_email_verified = True
        user.is_admin_verified = True
        user.is_profile_completed = False # Profile must be filled
        
        if commit:
            user.save()
        return user

class CustomUserChangeForm(UserChangeForm):
    """
    A form for updating existing users in the admin.
    """
    class Meta:
        model = User
        fields = '__all__' # Include all fields from the model

