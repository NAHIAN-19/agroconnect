from django.conf import settings
from django.db import models


class FarmerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farmer_profile')
    farm_name = models.CharField(max_length=100)
    pickup_address = models.TextField()
    nid_number = models.CharField(max_length=20)
    # In a real app, you would use an ImageField and configure media storage
    # nid_photo = models.ImageField(upload_to='nid_photos/')

    def __str__(self):
        return f"Farmer Profile for {self.user.email}"


class BuyerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buyer_profile')
    business_name = models.CharField(max_length=100)
    delivery_address = models.TextField()
    nid_number = models.CharField(max_length=20)
    # nid_photo = models.ImageField(upload_to='nid_photos/')

    def __str__(self):
        return f"Buyer Profile for {self.user.email}"
