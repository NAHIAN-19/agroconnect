from django.contrib import admin
from .models import Product, Review


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'seller',
        'category',
        'price',
        'stock',
        'unit',
        'verified',
        'is_active',
        'rating',
        'reviews',
        'created_at'
    ]
    list_filter = [
        'category',
        'verified',
        'is_active',
        'created_at'
    ]
    search_fields = [
        'name',
        'description',
        'seller__email',
        'seller__seller_profile__store_name'
    ]
    readonly_fields = ['created_at', 'updated_at', 'rating', 'reviews']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'category', 'image')
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'stock', 'unit')
        }),
        ('Status', {
            'fields': ('verified', 'is_active')
        }),
        ('Seller', {
            'fields': ('seller',)
        }),
        ('Statistics', {
            'fields': ('rating', 'reviews'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = [
        'product',
        'buyer',
        'rating',
        'comment_preview',
        'created_at'
    ]
    list_filter = [
        'rating',
        'created_at'
    ]
    search_fields = [
        'product__name',
        'buyer__email',
        'comment'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    def comment_preview(self, obj):
        """Show first 50 characters of comment"""
        return obj.comment[:50] + '...' if len(obj.comment) > 50 else obj.comment
    comment_preview.short_description = 'Comment Preview'

