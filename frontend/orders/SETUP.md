# Orders App Setup Instructions

## 1. Add to INSTALLED_APPS

Add `'orders'` to your Django `settings.py`:

```python
INSTALLED_APPS = [
    # ... other apps
    'products',
    'orders',  # Add this
    # ... rest of apps
]
```

## 2. Add to Main URLs

Add the orders app URLs to your main `urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... other patterns
    path('api/v1/', include('products.urls')),
    path('api/v1/', include('orders.urls')),  # Add this
    # ... rest of patterns
]
```

## 3. Run Migrations

```bash
python manage.py makemigrations orders
python manage.py migrate
```

## 4. Seed Demo Data (Optional)

```bash
python manage.py seed_orders
```

To clear existing orders and reseed:

```bash
python manage.py seed_orders --clear
```

## 5. Create Superuser and Access Admin (Optional)

```bash
python manage.py createsuperuser
```

Then access Django admin at `/admin/` to manage orders.

## API Endpoints

After setup, the following endpoints will be available:

- `GET /api/v1/orders/` - List orders
- `POST /api/v1/orders/` - Create order
- `GET /api/v1/orders/{id}/` - Get order detail
- `PATCH /api/v1/orders/{id}/ship/` - Ship order (seller only)
- `GET /api/v1/orders/{id}/track/` - Track order
- `GET /api/v1/orders/my/` - Get buyer's orders
- `GET /api/v1/orders/seller/` - Get seller's orders

## Features Implemented

✅ Order model with all SSLCommerz fields
✅ Order model with all RedX shipping fields
✅ OrderItem model for multiple products per order
✅ Order creation with stock validation
✅ Order filtering by status, payment, shipping
✅ Permissions (buyers create, sellers ship)
✅ Auto-generated order numbers
✅ Order tracking functionality
✅ Demo data seeding command

## Next Steps (TODO)

- [ ] Implement SSLCommerz payment gateway integration
- [ ] Implement RedX shipping API integration
- [ ] Add webhook handlers for payment callbacks
- [ ] Add order cancellation functionality
- [ ] Add order refund functionality

