# Django imports
import logging
from django.contrib.auth import authenticate, update_session_auth_hash
from django.utils import timezone
from django.http import Http404


# Third party imports
from rest_framework import serializers, status, permissions
from rest_framework.generics import CreateAPIView, GenericAPIView, RetrieveUpdateAPIView, UpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# App imports
from apps.users.models import User, EmailVerificationToken, BuyerProfile, SellerProfile
from apps.users.serializers import (
    TokenRefreshCookieSerializer, BuyerProfileSerializer, SellerProfileSerializer,
    EmailVerificationSerializer, ResendVerificationSerializer, ChangePasswordSerializer,
    UserRegistrationSerializer, OnboardingSerializer, MyProfileSerializer
)
from apps.users.permissions import IsEmailVerified, IsNotProfileCompleted, IsProfileCompleted
from apps.users.tasks import send_verification_email_task
from utils.response import APIResponse
from utils.tokens import AuthCookieHandler
from utils.throttle import BurstRateThrottle, SustainedRateThrottle

# Configure logging
logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Handles standard email/password login.
    Overrides the default 'post' method to use AuthCookieHandler
    to set the secure HttpOnly refresh token cookie.
    Uses APIResponse for standardized responses.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # APIResponse for the error
            return APIResponse.error(
                message="Invalid credentials",
                errors={"code": "invalid_credentials"},
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        user = serializer.user
        
        # Our Custom Response
        response = APIResponse.success(
            message="Login successful",
            status_code=status.HTTP_200_OK
        )
        
        # Instantiate our handler
        handler = AuthCookieHandler(response)
        
        # Set cookies and add user/access token to the response body
        handler.set(user)
        
        return response


class CustomTokenRefreshView(TokenRefreshView):
    """
    Handles refreshing the access token.
    Uses our custom serializer to read the refresh token from the cookie.
    Uses APIResponse for standardized responses.
    """
    serializer_class = TokenRefreshCookieSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except InvalidToken as e:
            # APIResponse for the error
            return APIResponse.unauthorized(
                message=str(e),
                errors={"code": "token_not_valid"}
            )

        # Customize Response
        response = APIResponse.success(
            message="Access token refreshed successfully",
            data={"access_token": serializer.validated_data['access']},
            status_code=status.HTTP_200_OK
        )
        
        # Set the new refresh token in the cookie
        handler = AuthCookieHandler(response) # Instantiate handler
        
        new_refresh_token = serializer.validated_data.get('refresh')
        
        if new_refresh_token:
            response.set_cookie(
                key=handler.cookie_name,
                value=str(new_refresh_token),
                max_age=handler.cookie_lifetime.total_seconds(),
                secure=handler.cookie_secure,
                httponly=handler.cookie_httponly,
                samesite=handler.cookie_samesite
            )
            
        return response


class UserRegistrationView(CreateAPIView):
    """
    Handles new user registration.
    - If user exists but is inactive, resends verification email.
    - If user is active, serializer fails.
    - If user does not exist, creates new inactive user and sends verification.
    """
    permission_classes = [AllowAny,]
    serializer_class = UserRegistrationSerializer
    throttle_classes = [AnonRateThrottle] # Throttle anonymous registration attempts

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            return APIResponse.validation_error(
                errors=serializer.errors
            )
        
        validated_data = serializer.validated_data
        email = validated_data['email'].lower()

        # --- MODIFIED LOGIC ---
        try:
            # Check for an existing, *inactive* user
            existing_user = User.objects.get(email__iexact=email, is_active=False)
            
            # User exists but is inactive. DO NOT update. Just resend the OTP.
            logger.info(f"Inactive user {email} attempting re-registration. Resending OTP.")
            
            try:
                plain_code = EmailVerificationToken.objects.create_code(
                    user=existing_user,
                    purpose=EmailVerificationToken.PurposeChoices.REGISTRATION,
                    target_email=existing_user.email
                )
                send_verification_email_task.delay(existing_user.id, plain_code, email)
            
            except Exception as e:
                logger.error(f"Error resending verification email for user {existing_user.email}: {e}")
            
            # Return a 200 OK, not a 201 CREATED
            return APIResponse.success(
                message="Account already registered but not verified. A new verification email has been sent.",
                status_code=status.HTTP_200_OK
            )

        except User.DoesNotExist:
            # No inactive user found, proceed with normal creation.
            # .save() calls serializer.create()
            user = serializer.save()
            logger.info(f"Created new inactive user: {user.email}")
        

        # --- Send Verification Email for *new* user ---
        try:
            plain_code = EmailVerificationToken.objects.create_code(
                user=user,
                purpose=EmailVerificationToken.PurposeChoices.REGISTRATION,
                target_email=user.email
            )
            
            # Offload email sending to Celery
            send_verification_email_task.delay(user.id, plain_code, email)
            
        except Exception as e:
            # If email fails, the user is still created, but we log the error.
            # The user can request a new code.
            logger.error(f"Error sending verification email for new user {user.email}: {e}")
        
        return APIResponse.success(
            message="Registration successful. Please check your email to verify your account.",
            status_code=status.HTTP_201_CREATED
        )

class EmailVerificationAPIView(APIView):
    """
    Handles the 6-digit code verification.
    If successful, activates the user and returns auth tokens.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle] # Throttle verification attempts

    def post(self, request, *args, **kwargs):
        serializer = EmailVerificationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return APIResponse.validation_error(errors=serializer.errors)
        
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        
        # --- Use our manager to verify ---
        (token_obj, status_key) = EmailVerificationToken.objects.verify_code(
            plain_code=code,
            purpose=EmailVerificationToken.PurposeChoices.REGISTRATION,
            target_email=email
        )
        
        # --- Handle all failure cases ---
        if status_key == "INVALID":
            return APIResponse.error(
                message="Invalid verification code.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        if status_key == "ATTEMPTS":
            return APIResponse.error(
                message="Too many attempts. A new code may be required.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        if status_key == "EXPIRED":
            return APIResponse.error(
                message="Verification code has expired.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
        # --- Handle Success ---
        if status_key == "SUCCESS":
            user = token_obj.user
            
            # Mark email as verified and activate the user
            user.mark_email_as_verified()
            
            # --- Log the user in ---
            response = APIResponse.success(
                message="Email verified successfully. You are now logged in.",
                status_code=status.HTTP_200_OK
            )
            
            handler = AuthCookieHandler(response)
            handler.set(user) # Sets cookie and adds user/token to response data
            
            return response
            
        # Fallback for any unhandled status
        print(f"Unexpected status key: {status_key}"    )
        return APIResponse.server_error(message="An unexpected error occurred.")


class ResendVerificationAPIView(APIView):
    """
    Handles requests to resend a verification code.
    Finds the inactive user, creates a new code, and sends it.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle] # Throttle to prevent email spam

    def post(self, request, *args, **kwargs):
        serializer = ResendVerificationSerializer(data=request.data)

        if not serializer.is_valid():
            return APIResponse.validation_error(errors=serializer.errors)

        # The serializer has already validated that an inactive user exists.
        user = serializer.validated_data['user']
        
        try:
            # Call the manager to create a new code.
            # This automatically invalidates any old, unverified codes.
            plain_code = EmailVerificationToken.objects.create_code(
                user=user,
                purpose=EmailVerificationToken.PurposeChoices.REGISTRATION,
                target_email=user.email
            )
            
            # Call the task to send the new email.
            send_verification_email_task.delay(user.id, plain_code, user.email)
            
        except Exception as e:
            # This would be an internal error (e.g., mail server down)
            logger.error(f"Error resending verification email for user {user.email}: {e}")
            return APIResponse.server_error(
                message="An error occurred while trying to send the email."
            )
        
        # We just return a simple success message.
        return APIResponse.success(
            message="A new verification code has been sent to your email.",
            status_code=status.HTTP_200_OK
        )
    
class LogoutAPIView(APIView):
    """
    Handles user logout by clearing the HttpOnly refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        response = APIResponse.success(
            message="You have been logged out successfully."
        )
        
        # Use the handler to delete the cookie
        handler = AuthCookieHandler(response)
        handler.delete()
        
        return response
    
class OnboardingAPIView(CreateAPIView):
    """
    Handles the post-email-verification onboarding step.
    A user provides their chosen role (BUYER or SELLER) and
    their initial profile data in a single request.
    """
    serializer_class = OnboardingSerializer
    
    # User must be logged in, email-verified, and not yet have a completed profile.
    permission_classes = [
        permissions.IsAuthenticated, 
        IsEmailVerified,
        IsNotProfileCompleted
    ]

    def create(self, request, *args, **kwargs):
        """
        Override the default create to customize the success response,
        following the pattern from your example.
        """
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # --- Re-fetch user with profile to ensure avatar_url works ---
        # This is a good practice from your example
        profile_related = ""
        if user.role == User.RoleChoices.BUYER:
            profile_related = "buyer_profile"
        elif user.role == User.RoleChoices.SELLER:
            profile_related = "seller_profile"
        
        # Default to the user object if no profile relation (e.g., admin)
        user_with_profile = user 
        
        if profile_related:
            try:
                # Eagerly load the related profile
                user_with_profile = User.objects.select_related(profile_related).get(pk=user.pk)
            except User.DoesNotExist:
                # Should not happen, but good to be safe
                pass 

        # --- Build the standardized user data response ---
        user_data = {
            "id": user_with_profile.id,
            "email": user_with_profile.email, # This is the normalized login email
            "full_name": user_with_profile.get_full_name(),
            "role": user_with_profile.role,
            "avatar_url": user_with_profile.avatar_url,
            "is_email_verified": user_with_profile.is_email_verified,
            "is_profile_completed": user_with_profile.is_profile_completed,
            "is_admin_verified": user_with_profile.is_admin_verified,
        }

        return APIResponse.success(
            data={"user": user_data},
            message="Onboarding completed successfully.",
            status_code=status.HTTP_201_CREATED
        )
    
class MyProfileAPIView(APIView):
    """
    A smart view for retrieving and updating the logged-in user's profile.
    GET: Returns a combined User + Profile data object.
    PATCH: Updates the role-specific profile (Buyer or Seller).
    """
    permission_classes = [
        permissions.IsAuthenticated, 
        IsEmailVerified, 
        IsProfileCompleted # Must have completed onboarding
    ]

    def get_profile_instance_and_serializer_class(self, user):
        """
        Helper: Gets the profile *instance* and *serializer class*.
        """
        if user.role == User.RoleChoices.BUYER:
            try:
                profile = user.buyer_profile
                serializer_class = BuyerProfileSerializer
                return profile, serializer_class, "buyer_profile"
            except BuyerProfile.DoesNotExist:
                raise Http404("Buyer profile not found.")
                
        elif user.role == User.RoleChoices.SELLER:
            try:
                profile = user.seller_profile
                serializer_class = SellerProfileSerializer
                return profile, serializer_class, "seller_profile"
            except SellerProfile.DoesNotExist:
                raise Http404("Seller profile not found.")
                
        else:
            raise Http404("No valid profile found for this user role.")

    def get(self, request, *args, **kwargs):
        """
        Handle GET requests.
        Use the MyProfileSerializer to return combined data.
        """
        user = request.user
        
        # Optimize by pre-fetching the related profile
        if user.role == User.RoleChoices.BUYER:
            user = User.objects.select_related('buyer_profile').get(pk=user.pk)
        elif user.role == User.RoleChoices.SELLER:
            user = User.objects.select_related('seller_profile').get(pk=user.pk)
        
        serializer = MyProfileSerializer(user)
        return APIResponse.success(data=serializer.data)

    def patch(self, request, *args, **kwargs):
        """
        Handle PATCH requests.
        Use the *role-specific* serializer (Buyer/Seller) to update.
        """
        try:
            # This helper finds the correct profile (Buyer or Seller) to update
            profile_instance, serializer_class, profile_key = self.get_profile_instance_and_serializer_class(request.user)
            
            # --- THIS IS THE FIX ---
            #
            # Check if the payload is nested (e.g., {"seller_profile": {...}})
            # or flat (e.g., {"store_name": "..."}).
            patch_data = request.data
            
            if profile_key in request.data:
                # If nested, extract the sub-dictionary
                patch_data = request.data[profile_key]
            # If flat, patch_data just remains request.data
            
            # Use partial=True to allow partial updates
            serializer = serializer_class(
                profile_instance, 
                data=patch_data, # Use the extracted data
                partial=True
            )
            
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            # --- IMPORTANT ---
            # After a successful PATCH, we must return the *full, combined*
            # profile data, just like the GET request, so the frontend
            # can update its state with the fresh, complete object.
            
            user = request.user
            if user.role == User.RoleChoices.BUYER:
                user = User.objects.select_related('buyer_profile').get(pk=user.pk)
            elif user.role == User.RoleChoices.SELLER:
                user = User.objects.select_related('seller_profile').get(pk=user.pk)

            return APIResponse.success(
                data=MyProfileSerializer(user).data, # <-- Return the combined object
                message="Profile updated successfully."
            )
            
        except Http404 as e:
            return APIResponse.not_found(message=str(e))
        except serializers.ValidationError as e:
            return APIResponse.validation_error(errors=e.detail)

class ChangePasswordView(UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    throttle_classes = [BurstRateThrottle, SustainedRateThrottle]
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return APIResponse.success(
            message="Password updated successfully.",
            status_code=status.HTTP_200_OK
        )