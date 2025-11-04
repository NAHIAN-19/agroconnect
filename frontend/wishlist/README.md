# Wishlist App

Django app for managing user wishlists.

## Setup Instructions

### 1. Add to INSTALLED_APPS

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

### 2. Add to Main URLs

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

### 3. Run Migrations

```bash
python manage.py makemigrations wishlist
python manage.py migrate
```

## Models

### Wishlist

- `user`: ForeignKey to User (buyer)
- `product`: ForeignKey to Product
- `created_at`: Auto timestamp
- `updated_at`: Auto timestamp
- **Unique constraint**: One entry per user per product

## API Endpoints

### List Wishlist
`GET /api/v1/wishlist/`

**Response:** List of wishlist items with product details

### Add to Wishlist
`POST /api/v1/wishlist/add/`

**Request Body:**
```json
{
  "product_id": 1
}
```

**Response:** Created wishlist item

### Remove from Wishlist
`DELETE /api/v1/wishlist/remove/`

**Request Body:**
```json
{
  "product_id": 1
}
```

**Response:** Success message

### Check if Product in Wishlist
`GET /api/v1/wishlist/check/?product_id=1`

**Response:**
```json
{
  "status": "success",
  "data": {
    "is_in_wishlist": true,
    "product_id": 1
  }
}
```

### Delete Wishlist Item (by ID)
`DELETE /api/v1/wishlist/{id}/`

**Response:** Success message

## Features

✅ Add products to wishlist
✅ Remove products from wishlist
✅ Check if product is in wishlist
✅ List all wishlist items for current user
✅ Unique constraint (one entry per user per product)
✅ Automatic user assignment (from request.user)

