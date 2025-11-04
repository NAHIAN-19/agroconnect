# django imports
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

# third-party imports
from celery import shared_task
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_verification_email_task(self, user_id, plain_code, user_email):
    """
    Send verification email with a pre-generated OTP.
    Handles retries automatically.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)

        # Render email templates using the provided plain_code
        html_message = render_to_string('email_verification.html', {
            'user_name': user.get_full_name(),
            'otp_code': plain_code,  # <-- Use the passed-in code
            'user_email': user_email,
        })

        plain_message = render_to_string('email_verification.txt', {
            'user_name': user.get_full_name(),
            'otp_code': plain_code,  # <-- Use the passed-in code
            'user_email': user_email,
        })

        # Send email
        send_mail(
            subject='Verify Your Email Address - AgroConnect',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False,
        )

        # from apps.users.models import UserActivity
        # log_user_activity_task.delay(user.id, UserActivity.ActivityType.EMAIL_VERIFY, "Verification email sent")

        logger.info(f'Verification email sent successfully to {user_email}')
        return {'status': 'success', 'email': user_email}

    except User.DoesNotExist:
        logger.error(f'User with ID {user_id} not found.')
        return {'status': 'failed', 'reason': 'user_not_found'}

    except Exception as exc:
        logger.error(f'Failed to send verification email to user {user_id}: {exc}')
        try:
            # Retry the task after 60 seconds
            raise self.retry(exc=exc, countdown=60)
        except self.MaxRetriesExceededError:
            # If max retries are exceeded, log and raise the exception
            logger.error(f'Max retries exceeded for verification email of user {user_id}')
            raise exc