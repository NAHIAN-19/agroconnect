from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg
from accounts.models import User


class Product(models.Model):
    """
    Product model representing agricultural products sold by sellers.
    All fields match exactly what the frontend expects.
    """
    
    # Product Basic Information
    name = models.CharField(max_length=200, help_text="Product name (e.g., 'Fresh Organic Tomatoes')")
    description = models.TextField(help_text="Detailed product description")
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Price per unit in BDT"
    )
    stock = models.PositiveIntegerField(default=0, help_text="Available stock quantity")
    unit = models.CharField(max_length=20, default='kg', help_text="Unit of measurement (kg, piece, etc.)")
    category = models.CharField(max_length=50, help_text="Product category (e.g., 'Vegetables', 'Fruits')")
    
    # Product Images
    image = models.URLField(
        max_length=500,
        help_text="Primary product image URL (Cloudinary URL)"
    )
    # Note: Frontend supports images array but demo uses single image.
    # If needed later, create ProductImage model with ForeignKey to Product.
    
    # Product Status
    verified = models.BooleanField(
        default=False,
        help_text="Whether the product is verified (typically mirrors seller verification)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the product is active and visible in marketplace"
    )
    
    # Relationships
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='products',
        limit_choices_to={'role': 'SELLER'},  # Only users with SELLER role can be product sellers
        help_text="Seller who owns this product"
    )
    
    # Note: Use review_set to access reviews (to avoid conflict with reviews property)
    # product.review_set.all() returns all reviews
    # product.reviews returns the count (matches frontend expectation)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['seller']),
            models.Index(fields=['is_active', 'verified']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def seller_id(self):
        """Alias for seller.id - matches frontend expectation"""
        return self.seller.id if self.seller else None
    
    @property
    def farmer_id(self):
        """Alias for seller.id - matches frontend expectation (backward compatibility)"""
        return self.seller.id if self.seller else None
    
    @property
    def farmer_name(self):
        """Returns seller's store_name - matches frontend expectation"""
        if self.seller:
            try:
                # Access seller_profile.store_name safely
                if hasattr(self.seller, 'seller_profile') and self.seller.seller_profile:
                    return self.seller.seller_profile.store_name
            except (AttributeError, ValueError):
                # Profile doesn't exist or is None
                pass
        return None
    
    @property
    def seller_name(self):
        """Alias for farmer_name - matches frontend expectation"""
        return self.farmer_name
    
    @property
    def rating(self):
        """Calculate average rating from reviews - matches frontend expectation"""
        reviews = self.review_set.all()
        if not reviews.exists():
            return None
        return round(reviews.aggregate(avg=Avg('rating'))['avg'] or 0, 1)
    
    @property
    def reviews(self):
        """
        Returns count of reviews - matches frontend expectation.
        Frontend uses product.reviews as a number (count), not a list.
        """
        return self.review_set.count()
    
    @property
    def is_low_stock(self):
        """Check if product has low stock (<= 10)"""
        return self.stock > 0 and self.stock <= 10


class Review(models.Model):
    """
    Review model for products. Reviews are connected to products.
    Each review is from a buyer who purchased the product.
    """
    
    # Rating and Comment
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5"
    )
    comment = models.TextField(help_text="Review comment/feedback")
    
    # Relationships
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='review_set',  # Use review_set to avoid conflict with product.reviews property
        help_text="Product being reviewed"
    )
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews',
        limit_choices_to={'role': 'BUYER'},  # Only users with BUYER role can write reviews
        help_text="Buyer who wrote the review"
    )
    # Optional: Link to order if you want to ensure only buyers who purchased can review
    # order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['product', 'buyer']  # One review per buyer per product
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['buyer']),
            models.Index(fields=['rating']),
        ]
    
    def __str__(self):
        return f"{self.buyer.email} - {self.product.name} - {self.rating} stars"
    
    @property
    def buyer_name(self):
        """Returns buyer's business name or full name - matches frontend expectation"""
        if self.buyer:
            # Try to get business_name from buyer_profile
            try:
                if hasattr(self.buyer, 'buyer_profile') and self.buyer.buyer_profile:
                    business_name = self.buyer.buyer_profile.business_name
                    if business_name:
                        return business_name
            except (AttributeError, ValueError):
                # Profile doesn't exist or is None
                pass
            # Fallback to full name or email
            full_name = self.buyer.get_full_name()
            if full_name and full_name.strip():
                return full_name.strip()
            return self.buyer.email
        return None
    
    @property
    def buyer_avatar(self):
        """
        Returns buyer's avatar URL - matches frontend expectation.
        Uses User model's avatar_url property which already handles
        buyer_profile.picture and fallback generation.
        """
        if self.buyer:
            return self.buyer.avatar_url
        return None
    
    @property
    def product_name(self):
        """Returns product name - matches frontend expectation"""
        return self.product.name if self.product else None

