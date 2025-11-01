from django.urls import path
from .views import ProfileSetupView

urlpatterns = [
    path('setup/', ProfileSetupView.as_view(), name='profile-setup'),
]
