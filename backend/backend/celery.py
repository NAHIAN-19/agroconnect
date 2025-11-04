import os
from celery import Celery
from celery.schedules import crontab

# choose the settings module to load Celery (use dev/prod via env when deploying)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.getenv("DJANGO_SETTINGS_MODULE", "backend.settings.dev"))

app = Celery("backend")

# Read config from Django settings, namespace 'CELERY'
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks inside installed apps' tasks.py
app.autodiscover_tasks()

# app.conf.beat_schedule = {
#     'delete-unverified-accounts': {
#         'task': 'apps.users.tasks.cleanup_unverified_users',
#         'schedule': crontab(minute=59, hour='23'), 
#     },
#     "delete-old-invites": {
#         "task": "apps.teams.tasks.delete_old_invites",
#         "schedule": crontab(minute=59, hour="23"),
#     },
#     "cleanup-expired-otps": {
#         "task": "apps.users.tasks.cleanup_expired_email_verifications",
#         "schedule": crontab(minute=0, hour="3"),
#     },
# }