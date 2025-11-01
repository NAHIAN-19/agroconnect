from rest_framework import generics, status
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, OTPSerializer, CustomTokenObtainPairSerializer
from .models import EmailVerificationToken
from utils.response import APIResponse
from .cookie_handler import AuthCookieHandler

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # In a real app, you would send an email here with the token
        token = EmailVerificationToken.objects.create_token(user)
        print(f"OTP for {user.email}: {token.token}")

        return APIResponse.success(
            status_code=status.HTTP_201_CREATED,
            message='Account created! Please check your email for the OTP.',
            data={'email': user.email}
        )

class VerifyOTPView(generics.GenericAPIView):
    serializer_class = OTPSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return APIResponse.error(status_code=status.HTTP_400_BAD_REQUEST, message="User not found.")

        if EmailVerificationToken.objects.verify_token(user, otp):
            user.is_verified = True
            user.save()

            response = APIResponse.success(message="Welcome! Your email has been verified.")
            handler = AuthCookieHandler(response)
            handler.set(user)
            return response

        return APIResponse.error(status_code=status.HTTP_400_BAD_REQUEST, message="Invalid or expired OTP.")


class LoginView(generics.GenericAPIView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        response = APIResponse.success(message="Login successful.")
        handler = AuthCookieHandler(response)
        handler.set(user)
        return response


class LogoutView(APIView):
    def post(self, request, *args, **kwargs):
        response = APIResponse.success(message="Logout successful.")
        handler = AuthCookieHandler(response)
        handler.delete()
        return response


class ResendOTPView(generics.GenericAPIView):
    serializer_class = OTPSerializer  # Re-use for email field

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return APIResponse.error(status_code=status.HTTP_400_BAD_REQUEST, message="Email is required.")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return APIResponse.error(status_code=status.HTTP_400_BAD_REQUEST, message="User not found.")

        # Invalidate old tokens if necessary (optional)
        EmailVerificationToken.objects.filter(user=user).delete()

        token = EmailVerificationToken.objects.create_token(user)
        print(f"New OTP for {user.email}: {token.token}")

        return APIResponse.success(message="A new OTP has been sent to your email.")
