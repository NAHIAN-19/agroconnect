# Django imports
from django.urls import path

# Local imports
from apps.users import views

urlpatterns = [
    # Authentication endpoints
    path("register/", views.UserRegistrationView.as_view(), name="register"),
    #path("logout/", views.LogoutView.as_view(), name="logout"),
    # Token endpoints
    path("login/", views.CustomTokenObtainPairView.as_view(), name="token_obtain"),
    path("token/refresh/", views.CustomTokenRefreshView.as_view(), name="token_refresh"),
    # Profile endpoints
    path("profile/my/", views.MyProfileAPIView.as_view(), name="profile"),
    # Password management endpoints
    path(
        "password/change/", views.ChangePasswordView.as_view(), name="change_password"
    ),
    # path(
    #     "password/reset/",
    #     views.PasswordResetRequestView.as_view(),
    #     name="password_reset_request",
    # ),
    # path(
    #     "password/reset/confirm/",
    #     views.PasswordResetConfirmView.as_view(),
    #     name="password_reset_confirm",
    # ),
    # OTP verification endpoints
    path("resend-otp/", views.ResendVerificationAPIView.as_view(), name="resend_verification"),
    path("verify-otp/", views.EmailVerificationAPIView.as_view(), name="verify_otp"),

    # profile related endpoints
    path("onboarding/", views.OnboardingAPIView.as_view(), name="onboarding"),
]
