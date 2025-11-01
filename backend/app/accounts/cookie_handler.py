from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from utils.response import APIResponse

import logging
logger = logging.getLogger(__name__)


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
    def __init__(self, response: APIResponse):
        self.response = response

        # --- Read all cookie settings ONCE ---
        self.cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get("AUTH_COOKIE_REFRESH", "refresh_token")
        self.cookie_lifetime = getattr(settings, 'SIMPLE_JWT', {}).get("REFRESH_TOKEN_LIFETIME", timedelta(days=1))
        self.cookie_secure = getattr(settings, 'SIMPLE_JWT', {}).get("AUTH_COOKIE_SECURE", True)
        self.cookie_httponly = getattr(settings, 'SIMPLE_JWT', {}).get("AUTH_COOKIE_HTTP_ONLY", True)
        self.cookie_samesite = getattr(settings, 'SIMPLE_JWT', {}).get("AUTH_COOKIE_SAMESITE", "Lax")

    def _get_tokens_for_user(self, user: User) -> dict:
        """
        Private helper to generate a token pair for a user.
        """
        try:
            refresh = RefreshToken.for_user(user)

            # Add minimal, safe claims
            access_token = refresh.access_token
            access_token["role"] = getattr(user, "role", None)

            return {
                "refresh": str(refresh),
                "access": str(access_token),
            }
        except Exception as e:
            logger.error(f"Error generating tokens for user {user.id}: {e}")
            return {}

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
        self.response.set_cookie(
            key=self.cookie_name,
            value=refresh_token,
            max_age=self.cookie_lifetime.total_seconds(),
            expires=timezone.now() + self.cookie_lifetime,
            secure=self.cookie_secure,
            httponly=self.cookie_httponly,
            samesite=self.cookie_samesite
        )

        # --- Add Access Token & User Data to Response Body ---
        if not isinstance(self.response.data, dict):
            self.response.data = {}

        payload = {
            "access_token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": getattr(user, "role", None),
                "is_email_verified": getattr(user, "is_verified", False),
            }
        }
        self.response.data["data"] = payload

    def delete(self) -> None:
        """
        Clears the HttpOnly refresh token cookie.

        This method modifies the `self.response` object in place.
        """
        self.response.delete_cookie(
            key=self.cookie_name,
            samesite=self.cookie_samesite
        )
