# Products App

This app contains the Product and Review models for the AgroConnect marketplace.

## Models

### Product
Represents agricultural products sold by sellers.

**Fields:**
- `name` - Product name
- `description` - Detailed description
- `price` - Price per unit (Decimal, BDT)
- `stock` - Available quantity (PositiveInteger)
- `unit` - Unit of measurement (default: 'kg')
- `category` - Product category (e.g., 'Vegetables', 'Fruits')
- `image` - Primary product image URL (Cloudinary)
- `verified` - Verification status (Boolean)
- `is_active` - Whether product is active and visible (Boolean)
- `seller` - ForeignKey to User (must have role='SELLER')
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Properties (for frontend compatibility):**
- `seller_id` - Alias for seller.id
- `farmer_id` - Alias for seller.id (backward compatibility)
- `farmer_name` - Returns seller's store_name
- `seller_name` - Alias for farmer_name
- `rating` - Average rating from reviews (calculated)
- `reviews` - Count of reviews (matches frontend expectation)
- `is_low_stock` - True if stock <= 10

**Access Reviews:**
- Use `product.review_set.all()` to get all reviews
- Use `product.reviews` to get the count (for frontend)

### Review
Represents buyer reviews for products.

**Fields:**
- `rating` - Rating from 1 to 5 (Integer)
- `comment` - Review comment/feedback (TextField)
- `product` - ForeignKey to Product
- `buyer` - ForeignKey to User (must have role='BUYER')
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Properties (for frontend compatibility):**
- `buyer_name` - Returns buyer's business_name or full_name
- `buyer_avatar` - Returns buyer's avatar_url or generates one
- `product_name` - Returns product.name

**Constraints:**
- Unique together: (product, buyer) - One review per buyer per product

## Frontend API Endpoints Expected

Based on frontend usage, the API should provide:

- `GET /api/v1/products/` - List all products
- `GET /api/v1/products/{id}/` - Get product detail
- `GET /api/v1/products/seller/` - Get seller's products
- `GET /api/v1/reviews/seller/` - Get reviews for seller's products
- `GET /api/v1/sellers/{id}/products/` - Get seller's products
- `GET /api/v1/sellers/{id}/reviews/` - Get seller's reviews

## Notes

1. The `product.reviews` property returns a count (integer), not a queryset, to match frontend expectations.
2. Use `product.review_set` to access the actual Review objects.
3. The `verified` field on Product typically mirrors the seller's verification status but can be set independently.
4. Images are stored as URLs (Cloudinary URLs) in the `image` field. For multiple images, consider creating a separate `ProductImage` model later.

