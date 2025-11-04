# Order Flow Implementation

This document explains the complete order flow from creation to shipment/cancellation.

## Order Creation Flow

1. **Buyer adds products to cart** (`CartPage.jsx`)
   - Products are stored in Zustand cart store
   - Buyer can adjust quantities

2. **Buyer places order** (`POST /api/v1/orders/`)
   - Frontend: `CartPage.jsx` → `handlePlaceOrder()`
   - Backend: `orders/views.py` → `OrderViewSet.create()`
   - Creates order with:
     - Buyer assigned automatically from `request.user`
     - Order items created from cart items
     - Stock reduced for each product
     - Order number auto-generated (e.g., `ORD-20240115-001`)
     - Status set to `pending`
   
3. **Order appears in buyer's orders** (`GET /api/v1/orders/my/`)
   - Buyer can view order in `/my-orders` page
   - Order shows with all details and status

4. **Payment initiation** (Optional)
   - After order creation, buyer is redirected to SSLCommerz payment gateway
   - On payment success/failure, order status is updated via webhook callbacks

## Seller View

5. **Order appears in seller dashboard** (`GET /api/v1/orders/seller/`)
   - Sellers see orders containing their products
   - Visible in "Orders" tab of Seller Dashboard
   - Orders are filtered: `order_items__product__seller=user`
   - Shows buyer info, products, quantities, totals

## Seller Actions

6. **Ship Order** (`PATCH /api/v1/orders/{id}/ship/`)
   - Seller can ship orders containing their products
   - Frontend: `SellerDashboardPage.jsx` → `handleShip(orderId)`
   - Backend: `orders/views.py` → `OrderViewSet.ship()`
   - Actions:
     - Verifies seller owns a product in the order
     - Checks payment status (must be completed for SSLCommerz)
     - Creates RedX shipment via `create_redx_shipment()`
     - Updates order:
       - Status → `shipped`
       - Shipping status → `in_transit`
       - RedX tracking number stored
       - `shipped_at` timestamp set

7. **Cancel Order** (`PATCH /api/v1/orders/{id}/`)
   - Seller can cancel orders containing their products
   - Frontend: `SellerDashboardPage.jsx` → `handleCancel(orderId)`
   - Backend: `orders/views.py` → `OrderViewSet.partial_update()`
   - Actions:
     - Verifies seller owns a product in the order
     - Prevents cancelling delivered/cancelled orders
     - Updates order status → `cancelled`
     - Note: Stock is NOT automatically restored (can be implemented if needed)

## API Endpoints Summary

### Buyer Endpoints
- `POST /api/v1/orders/` - Create order (buyer only)
- `GET /api/v1/orders/my/` - Get buyer's own orders
- `GET /api/v1/orders/{id}/` - Get order detail
- `GET /api/v1/orders/{id}/track/` - Track order

### Seller Endpoints
- `GET /api/v1/orders/seller/` - Get orders for seller's products
- `GET /api/v1/orders/{id}/` - Get order detail (if seller's product in order)
- `PATCH /api/v1/orders/{id}/ship/` - Ship order (seller only, product must be in order)
- `PATCH /api/v1/orders/{id}/` - Cancel order (seller only, product must be in order)

## Order Status Flow

```
pending → paid → processing → shipped → delivered
                ↓
           cancelled (by seller)
```

## Permissions

- **Buyers**: Can create orders, view their own orders
- **Sellers**: Can view orders containing their products, ship/cancel those orders
- **Ownership checks**: Backend verifies seller has product in order before ship/cancel

## Frontend Pages

1. **Cart Page** (`/cart`)
   - Add delivery address
   - Place order button
   - Redirects to payment or `/my-orders`

2. **My Orders** (`/my-orders`)
   - Shows buyer's orders
   - Filter: Only current user's orders
   - Features: Payment, Track, Review

3. **Seller Dashboard** (`/dashboard` - Orders tab)
   - Shows orders for seller's products
   - Filter: Only orders containing seller's products
   - Actions: Ship, Cancel buttons

## Backend Filtering

The `get_queryset()` method in `OrderViewSet` automatically filters:
- **Buyers**: `queryset.filter(buyer=user)`
- **Sellers**: `queryset.filter(order_items__product__seller=user).distinct()`

This ensures users only see orders they're authorized to view.

## Notes

- Orders are sorted by delivery priority (non-delivered first, then by date)
- Stock is reduced when order is created
- Order numbers are auto-generated with date prefix
- RedX shipment is created automatically when seller ships order
- Payment status must be `success` before seller can ship (for SSLCommerz orders)

