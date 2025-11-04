from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.hashers import make_password, check_password
from datetime import timedelta
from django.db import models
from django.utils import timezone
import secrets


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email must be set')
        if not extra_fields.get('first_name'):
            raise ValueError('First Name must be set')
        if not extra_fields.get('phone_number'):
            raise ValueError('Phone must be set')
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, first_name, password=None, **extra_fields):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', User.RoleChoices.ADMIN)
        extra_fields.setdefault('phone_number', '01234567890')
        extra_fields.setdefault('first_name', first_name)

        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')


        return self.create_user(email, password, **extra_fields)


class EmailVerificationTokenManager(models.Manager):

    def generate_code(self, length: int = 6) -> str:
        """Generates a secure, random N-digit code."""
        if not (4 <= length <= 8):
            raise ValueError("OTP length must be between 4 and 8 digits.")
        
        range_start = 10**(length - 1)
        range_end = (10**length) - 1
        
        # 'secrets' is cryptographically secure
        code = secrets.randbelow(range_end - range_start + 1) + range_start
        
        # Return as a zero-padded string
        return f"{code:0{length}d}"

    def create_code(self, user, purpose, target_email, expiry_hours=1):
        """
        Creates a new, hashed verification code for a user.
        Returns the *plain-text code* for use in the email.
        NOTE: Expiry is set to 1 hour for a short-lived code.
        """
        # Invalidate any existing, unverified tokens for this user and purpose
        self.get_queryset().filter(
            user=user, 
            purpose=purpose, 
            is_verified=False
        ).delete()

        # Generate plain-text code
        plain_code = self.generate_code(length=6)
        
        # Hash the code for storage
        hashed_code = make_password(plain_code)

        # Set expiry
        expires_at = timezone.now() + timedelta(hours=expiry_hours)

        # Create the new token instance
        token_instance = self.create(
            user=user,
            code_hash=hashed_code,
            purpose=purpose,
            target_email=target_email,
            expires_at=expires_at
        )

        # Return the PLAIN text code so it can be sent
        return plain_code

    def verify_code(self, plain_code: str, purpose: str, target_email: str):
        """
        Finds the specific active code for a target email & purpose,
        checks it, and tracks attempts.
        
        Returns a tuple: (token_object, status_string)
        Possible statuses: "SUCCESS", "INVALID", "EXPIRED", "MAX_ATTEMPTS", "NOT_FOUND"
        """
        
        # 1. Find the specific active token
        try:
            token_obj = self.get_queryset().get(
                purpose=purpose,
                target_email=target_email,
                is_verified=False
            )
        except self.model.DoesNotExist:
            return (None, "NOT_FOUND")

        # 2. Check if expired
        if token_obj.is_expired:
            return (token_obj, "EXPIRED")

        # 3. Check if max attempts reached
        if token_obj.attempt_count >= token_obj.MAX_ATTEMPTS:
            return (token_obj, "MAX_ATTEMPTS")

        # 4. Not maxed out, so increment attempt count
        token_obj.attempt_count = models.F('attempt_count') + 1
        token_obj.save(update_fields=['attempt_count'])
        token_obj.refresh_from_db() # Get the new F-object value

        # 5. Check the code
        if check_password(plain_code, token_obj.code_hash):
            # Success! Mark as verified.
            token_obj.is_verified = True
            token_obj.save(update_fields=['is_verified'])
            return (token_obj, "SUCCESS")
        
        # 6. Code was wrong
        return (token_obj, "INVALID")