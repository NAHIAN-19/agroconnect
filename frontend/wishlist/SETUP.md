# Wishlist App Setup Instructions

## 1. Add to INSTALLED_APPS

Add `'wishlist'` to your Django `settings.py`:

```python
INSTALLED_APPS = [
    # ... other apps
    'products',
    'orders',
    'wishlist',  # Add this
    # ... rest of apps
]
```

## 2. Add to Main URLs

Add the wishlist app URLs to your main `urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... other patterns
    path('api/v1/', include('products.urls')),
    path('api/v1/', include('orders.urls')),
    path('api/v1/', include('wishlist.urls')),  # Add this
    # ... rest of patterns
]
```

## 3. Run Migrations

```bash
python manage.py makemigrations wishlist
python manage.py migrate
```

## 4. Create Superuser and Access Admin (Optional)

```bash
python manage.py createsuperuser
```

Then access Django admin at `/admin/` to manage wishlist items.

## API Endpoints

After setup, the following endpoints will be available:

- `GET /api/v1/wishlist/` - List current user's wishlist items
- `POST /api/v1/wishlist/add/` - Add product to wishlist (requires `product_id`)
- `DELETE /api/v1/wishlist/remove/` - Remove product from wishlist (requires `product_id`)
- `GET /api/v1/wishlist/check/?product_id=1` - Check if product is in wishlist
- `DELETE /api/v1/wishlist/{id}/` - Delete wishlist item by ID

## Features Implemented

✅ Add products to wishlist
✅ Remove products from wishlist
✅ Check if product is in wishlist
✅ List all wishlist items for current user
✅ Unique constraint (one entry per user per product)
✅ Automatic user assignment (from request.user)
✅ Frontend integration with ProductCard and ProductDetailPage
✅ Wishlist tab in Buyer Dashboard

## Frontend Integration

- ProductCard: Heart icon button to add/remove from wishlist
- ProductDetailPage: Heart icon button in product header
- BuyerDashboardPage: Wishlist tab showing all saved products with remove button

