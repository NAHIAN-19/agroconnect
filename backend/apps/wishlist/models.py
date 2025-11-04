from django.db import models
from apps.users.models import User
from apps.products.models import Product


class Wishlist(models.Model):
    """
    Wishlist model to allow users to save products they want to purchase later.
    One user can have multiple wishlist items, one item per product.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='wishlist_items',
        help_text="User who added the product to wishlist"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlist_users',
        help_text="Product in the wishlist"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'product']  # One entry per user per product
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['product']),
            models.Index(fields=['user', 'product']),
        ]
        verbose_name = 'Wishlist Item'
        verbose_name_plural = 'Wishlist Items'
    
    def __str__(self):
        return f"{self.user.email} - {self.product.name}"

