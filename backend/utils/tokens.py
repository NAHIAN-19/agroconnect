from django.contrib.auth.tokens import PasswordResetTokenGenerator
from six import text_type
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from rest_framework.response import Response
from apps.users.models import User
from datetime import timedelta
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    """
    Custom token generator. We can override make_hash_value to
    ensure the token is invalidated on email change, for example.
    """
    def _make_hash_value(self, user, timestamp):
        # This ensures the token is invalidated if the user"s password or email changes.
        return (
            text_type(user.pk) + text_type(timestamp) +
            text_type(user.email) + text_type(user.password)
        )

class AuthCookieHandler:
    """
    Handles setting and deleting auth-related cookies in a DRY, encapsulated way.
    
    Reads settings from `settings.SIMPLE_JWT` to ensure consistency.

    Usage:
        # In view
        response = APIResponse.success(...)
        handler = AuthCookieHandler(response)
        handler.set(user)
        return response
    """
    def __init__(self, response: Response):
        self.response = response
        
        # --- Read all cookie settings ONCE ---
        self.cookie_name = settings.SIMPLE_JWT.get("AUTH_COOKIE_REFRESH", "refresh_token")
        self.cookie_lifetime = settings.SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME", timedelta(days=1))
        self.cookie_secure = settings.SIMPLE_JWT.get("AUTH_COOKIE_SECURE", True)
        self.cookie_httponly = settings.SIMPLE_JWT.get("AUTH_COOKIE_HTTP_ONLY", True)
        self.cookie_samesite = settings.SIMPLE_JWT.get("AUTH_COOKIE_SAMESITE", "Lax")

    def _get_tokens_for_user(self, user: User) -> dict:
        """
        Private helper to generate a token pair for a user.
        """
        try:
            refresh = RefreshToken.for_user(user)
            
            # Add minimal, safe claims
            access_token = refresh.access_token
            access_token["phone"] = user.phone_number
            access_token["role"] = getattr(user, "role", User.RoleChoices.BUYER)
            
            return {
                "refresh": str(refresh),
                "access": str(access_token),
            }
        except Exception as e:
            logger.error(f"Error generating tokens for user {user.id}: {e}")
            return {}
        
    def set_refresh_cookie(self, refresh_token: str) -> None:
        """
        Sets the refresh token as a secure HttpOnly cookie.
        This is the single source of truth for cookie settings.
        """
        self.response.set_cookie(
            key=self.cookie_name,
            value=str(refresh_token),
            max_age=self.cookie_lifetime.total_seconds(),
            secure=self.cookie_secure,
            httponly=self.cookie_httponly,
            samesite=self.cookie_samesite
        )

    def set(self, user: User) -> None:
        """
        Generates tokens, sets the refresh token as a secure HttpOnly cookie,
        and adds the access token/user data to the response body.
        
        This method modifies the `self.response` object in place.
        """
        tokens = self._get_tokens_for_user(user)
        
        if not tokens:
            logger.error(f"Could not set auth cookies for user {user.id}: Token generation failed.")
            return

        access_token = tokens["access"]
        refresh_token = tokens["refresh"]

        # --- Set Refresh Token in Cookie (using shared config) ---
        self.set_refresh_cookie(refresh_token)
        
        # --- Add Access Token & User Data to Response Body ---
        if not isinstance(self.response.data, dict):
            self.response.data = {}
            
        payload = {
            "access_token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.get_full_name(),
                "role": getattr(user, "role", User.RoleChoices.BUYER),
                "is_email_verified": getattr(user, "is_email_verified", False),
                "is_profile_completed": getattr(user, "is_profile_completed", False),
                "is_admin_verified": getattr(user, "is_admin_verified", False),
                "avatar_url": getattr(user, "avatar_url", None)
            }
        }
        self.response.data["data"] = payload
        # self.response is modified in-place, so nothing to return
    def delete(self) -> None:
        """
        Clears the HttpOnly refresh token cookie.
        
        This method modifies the `self.response` object in place.
        """
        self.response.delete_cookie(
            key=self.cookie_name,
            samesite=self.cookie_samesite
        )