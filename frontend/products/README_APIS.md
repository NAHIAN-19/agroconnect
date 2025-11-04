# Products API Documentation

## Endpoints Overview

### Products

#### List Products
```
GET /api/v1/products/
```

**Query Parameters:**
- `search` - Search in name and description
- `category` - Filter by category (exact match)
- `categories` - Filter by multiple categories (comma-separated)
- `min_price` - Minimum price filter
- `max_price` - Maximum price filter
- `in_stock` - Filter products in stock (true/false)
- `low_stock` - Filter products with low stock (true/false)
- `verified` - Filter verified products (true/false)
- `is_active` - Filter active products (true/false)
- `seller` or `seller_id` - Filter by seller ID
- `ordering` - Order by: `created_at`, `price`, `stock`, `name` (prefix with `-` for descending)
- `page` - Page number
- `page_size` - Items per page (max 100)

**Example:**
```
GET /api/v1/products/?search=tomato&category=Vegetables&min_price=50&max_price=100&ordering=-created_at
```

**Response:**
```json
{
  "status": "success",
  "message": "Products retrieved successfully",
  "data": {
    "count": 10,
    "next": null,
    "previous": null,
    "page_size": 20,
    "total_pages": 1,
    "current_page": 1,
    "results": [
      {
        "id": 1,
        "name": "Fresh Organic Tomatoes",
        "description": "...",
        "price": "80.00",
        "stock": 150,
        "unit": "kg",
        "category": "Vegetables",
        "image": "https://...",
        "verified": true,
        "seller_id": 1,
        "farmer_id": 1,
        "farmer_name": "Green Valley Farm",
        "seller_name": "Green Valley Farm",
        "rating": 4.8,
        "reviews": 45,
        "created_at": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

#### Get Product Detail
```
GET /api/v1/products/{id}/
```

**Response:**
```json
{
  "status": "success",
  "message": "Product retrieved successfully",
  "data": {
    "id": 1,
    "name": "Fresh Organic Tomatoes",
    "description": "...",
    "price": "80.00",
    "stock": 150,
    "unit": "kg",
    "category": "Vegetables",
    "image": "https://...",
    "verified": true,
    "is_active": true,
    "seller_id": 1,
    "farmer_id": 1,
    "farmer_name": "Green Valley Farm",
    "seller_name": "Green Valley Farm",
    "rating": 4.8,
    "reviews": 45,
    "is_low_stock": false,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Create Product (Seller Only)
```
POST /api/v1/products/
```

**Request Body:**
```json
{
  "name": "Fresh Organic Tomatoes",
  "description": "Premium organic tomatoes",
  "price": "80.00",
  "stock": 150,
  "unit": "kg",
  "category": "Vegetables",
  "image": "https://res.cloudinary.com/...",
  "is_active": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Product created successfully",
  "data": { ... }
}
```

#### Update Product (Owner Only)
```
PATCH /api/v1/products/{id}/
PUT /api/v1/products/{id}/
```

#### Delete Product (Owner Only)
```
DELETE /api/v1/products/{id}/
```

#### Get Seller's Products
```
GET /api/v1/products/seller/
```

Returns products for the authenticated seller.

---

### Reviews

#### List Reviews
```
GET /api/v1/reviews/
```

**Query Parameters:**
- `product` or `product_id` - Filter by product ID
- `buyer` or `buyer_id` - Filter by buyer ID
- `seller` or `seller_id` - Filter by seller ID (reviews for seller's products)
- `rating` - Filter by exact rating (1-5)
- `min_rating` - Minimum rating filter
- `max_rating` - Maximum rating filter
- `ordering` - Order by: `created_at`, `rating` (prefix with `-` for descending)
- `page` - Page number
- `page_size` - Items per page

**Example:**
```
GET /api/v1/reviews/?product=1&min_rating=4&ordering=-created_at
```

#### Get Review Detail
```
GET /api/v1/reviews/{id}/
```

#### Create Review (Buyer Only)
```
POST /api/v1/reviews/
```

**Request Body:**
```json
{
  "product": 1,
  "rating": 5,
  "comment": "Excellent quality tomatoes!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Review created successfully",
  "data": {
    "id": 1,
    "product_id": 1,
    "product_name": "Fresh Organic Tomatoes",
    "buyer": 2,
    "buyer_name": "Fresh Market Co.",
    "buyer_avatar": "https://...",
    "rating": 5,
    "comment": "Excellent quality tomatoes!",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Update Review (Owner Only)
```
PATCH /api/v1/reviews/{id}/
PUT /api/v1/reviews/{id}/
```

#### Delete Review (Owner Only)
```
DELETE /api/v1/reviews/{id}/
```

#### Get Seller's Reviews
```
GET /api/v1/reviews/seller/
```

Returns reviews for the authenticated seller's products.

---

## Caching

- Product lists are cached for 5 minutes
- Product details are cached for 10 minutes
- Cache is invalidated on product create/update/delete
- Cache is invalidated on review create/update/delete (affects product ratings)

## Permissions

- **Products:**
  - List/Detail: Public (read-only)
  - Create/Update/Delete: Seller only (owner for update/delete)

- **Reviews:**
  - List/Detail: Public (read-only)
  - Create/Update/Delete: Buyer only (owner for update/delete)

## Rate Limiting

Rate limiting can be added via Django REST Framework throttling classes in settings:

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}
```

