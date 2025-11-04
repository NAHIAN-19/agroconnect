from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

class EmailBackend(ModelBackend):
    """
    Authenticates a user by email and password,
    and checks if they are allowed to authenticate.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        login_identifier = username or kwargs.get("email")
        if not login_identifier or not password:
            return None

        try:
            # We use iexact for case-insensitive email matching
            user = UserModel.objects.get(email__iexact=login_identifier)
        except UserModel.DoesNotExist:
            return None

        # --- THIS IS THE FIX ---
        # 1. Check the password
        # 2. Check if the user is active (user_can_authenticate checks is_active)
        print(user.check_password(password))
        print(self.user_can_authenticate(user))
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        
        return None