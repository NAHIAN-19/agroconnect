# SSLCommerz and RedX Integration Guide

## Overview

This document describes the complete implementation of SSLCommerz payment gateway and RedX shipping API integrations.

## Backend Implementation

### 1. SSLCommerz Integration

**Files:**
- `orders/utils.py` - `create_sslcommerz_session()`, `validate_sslcommerz_transaction()`
- `orders/payment_views.py` - Payment endpoints and callbacks
- `orders/urls.py` - Payment URL routes

**Endpoints:**
- `POST /api/v1/orders/{order_id}/payment/initiate/` - Initiate payment session
- `GET /api/v1/orders/payment/success/` - Success callback (from SSLCommerz)
- `GET /api/v1/orders/payment/fail/` - Failure callback (from SSLCommerz)
- `GET /api/v1/orders/payment/cancel/` - Cancel callback (from SSLCommerz)
- `POST /api/v1/orders/payment/ipn/` - IPN (Instant Payment Notification)

**Flow:**
1. User creates order → Order saved with `payment_status='pending'`
2. Frontend calls `/payment/initiate/` → Backend creates SSLCommerz session
3. User redirected to SSLCommerz GatewayPageURL
4. User completes payment on SSLCommerz
5. SSLCommerz redirects to success/fail/cancel URLs
6. Backend validates transaction and updates order status
7. User redirected to frontend success/fail/cancelled pages

**Transaction Validation:**
- After payment, backend validates using SSLCommerz Order Validation API
- Updates order with `val_id`, `payment_date`, and `payment_status='success'`
- Order status changed from `pending` to `paid`

### 2. RedX Integration

**Files:**
- `orders/utils.py` - `create_redx_shipment()`, `track_redx_shipment()`
- `orders/views.py` - `ship()` action updated to create RedX shipment

**Flow:**
1. Seller clicks "Mark as Shipped" → `PATCH /api/v1/orders/{id}/ship/`
2. Backend checks payment status (must be `success` for SSLCommerz)
3. Backend calls RedX API to create shipment
4. RedX returns tracking number
5. Order updated with:
   - `redx_tracking_number`
   - `redx_order_id`
   - `shipping_status='in_transit'`
   - `status='shipped'`
   - `shipped_at` timestamp

**Note:** If RedX credentials are not configured, mock tracking numbers are generated for development.

## Frontend Implementation

### 1. Payment Flow

**Files:**
- `src/pages/CartPage.jsx` - Order creation → Payment initiation
- `src/pages/PaymentSuccessPage.jsx` - Success page
- `src/pages/PaymentFailedPage.jsx` - Failure page
- `src/pages/PaymentCancelledPage.jsx` - Cancelled page
- `src/components/OrderRow.jsx` - "Pay Now" button for pending orders

**Flow:**
1. User fills cart and delivery address
2. Clicks "Place Order" → Order created
3. Frontend automatically initiates payment
4. Redirects to SSLCommerz gateway
5. After payment, SSLCommerz redirects back
6. User sees success/fail/cancelled page

**Pay Later Feature:**
- Orders with `payment_status='pending'` show "Pay Now" button
- Users can pay from order history or dashboard

### 2. Shipping Display

**Updated Files:**
- `src/pages/BuyerDashboardPage.jsx` - Shows RedX tracking number
- `src/pages/SellerDashboardPage.jsx` - Shows RedX tracking after shipping
- `src/pages/OrderHistoryPage.jsx` - Enhanced tracking modal

**Features:**
- Tracking number displayed when available
- Shipping status updates
- Delivery address shown
- Order status badges

## Configuration

### Required Settings (Django settings.py)

```python
# SSLCommerz
SSLCOMMERZ_STORE_ID = 'your_store_id'
SSLCOMMERZ_STORE_PASSWD = 'your_store_password'
SSLCOMMERZ_SANDBOX = True  # False for production

# RedX
REDX_API_KEY = 'your_long_api_key'  # Only credential needed for sandbox
REDX_MERCHANT_ID = ''  # Optional - Not provided in sandbox, may be needed for production
REDX_SANDBOX = True  # False for production

# Frontend URL for callbacks
FRONTEND_URL = 'http://localhost:3000'  # Change for production
```

### Default Sandbox Credentials (for testing)

SSLCommerz provides default sandbox credentials (already in code):
- Store ID: `agroc6000492a0ff0e5`
- Store Password: `agroc6000492a0ff0e5@ssl`

**Test Cards:**
- VISA: `4111111111111111`
- Mastercard: `5111111111111111`
- Expiry: `12/25`
- CVV: `111`
- Mobile OTP: `111111` or `123456`

## Order Status Flow

1. **Order Created** → `status='pending'`, `payment_status='pending'`
2. **Payment Initiated** → User redirected to SSLCommerz
3. **Payment Success** → `status='paid'`, `payment_status='success'`
4. **Seller Ships** → `status='shipped'`, `shipping_status='in_transit'`, RedX tracking created
5. **Delivered** → `status='delivered'`, `shipping_status='delivered'`, `delivered_at` set

## Error Handling

- **Payment Initiation Failure:** Order saved, user can retry payment
- **Payment Validation Failure:** Order marked as `pending_validation` for manual review
- **RedX API Failure:** Mock tracking generated (development mode)
- **Network Errors:** Proper error messages shown to users

## Security

- CSRF exemption only on payment callbacks (required by SSLCommerz)
- Payment initiation requires authentication
- Order ownership verified before payment/shipping
- Transaction validation via SSLCommerz API

## Testing

1. **Sandbox Mode:**
   - Use SSLCommerz sandbox credentials
   - Use test card numbers
   - RedX will generate mock tracking if not configured

2. **Production:**
   - Update credentials in settings
   - Set `SSLCOMMERZ_SANDBOX = False`
   - Set `REDX_SANDBOX = False`
   - Update `FRONTEND_URL` to production domain

## API Response Formats

All endpoints use the standardized `APIResponse` format:

```json
{
  "status": "success",
  "message": "Operation successful",
  "data": { ... },
  "errors": null
}
```

Payment endpoints return redirects for callbacks (SSLCommerz requirement).

