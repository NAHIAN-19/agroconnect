# Orders App

This app handles order management with integration for SSLCommerz payment gateway and RedX shipping service.

## Models

### Order
Represents a customer order with payment and shipping information.

**Fields:**
- `order_number` - Unique order number (auto-generated: ORD-YYYYMMDD-XXX)
- `buyer` - ForeignKey to User (BUYER role)
- `subtotal` - Sum of all order items
- `delivery_fee` - Shipping cost (default: 50.00 BDT)
- `total_amount` - Total amount (subtotal + delivery_fee)
- `status` - Order status (pending, paid, processing, shipped, delivered, cancelled, refunded)
- `payment_method` - Payment method (sslcommerz, cod)
- `payment_status` - Payment status (pending, success, failed, cancelled)
- `sslcommerz_session_key` - SSLCommerz session key
- `sslcommerz_tran_id` - SSLCommerz transaction ID
- `sslcommerz_val_id` - SSLCommerz validation ID
- `payment_date` - Payment completion date
- `recipient_name` - Delivery recipient name
- `recipient_phone` - Delivery recipient phone
- `recipient_address` - Complete delivery address
- `recipient_city` - City
- `recipient_area` - Area/zone
- `recipient_postcode` - Postal code
- `redx_order_id` - RedX order ID
- `redx_tracking_number` - RedX tracking number
- `shipping_status` - Shipping status (pending, picked_up, in_transit, delivered)
- `shipped_at` - Shipment date
- `delivered_at` - Delivery date
- `notes` - Additional notes

**Properties:**
- `seller_ids` - List of unique seller IDs in this order
- `buyer_name` - Buyer's business name or full name

### OrderItem
Represents individual products in an order.

**Fields:**
- `order` - ForeignKey to Order
- `product` - ForeignKey to Product
- `quantity` - Quantity ordered
- `unit_price` - Price per unit at time of order (snapshot)
- `total_price` - Total price for this item

**Properties:**
- `seller_id` - Product seller ID
- `seller_name` - Product seller name
- `product_name` - Product name
- `product_image` - Product image URL

## API Endpoints

### List Orders
`GET /api/v1/orders/`

**Response:** Paginated list of orders (filtered by user role)

### Get Order Detail
`GET /api/v1/orders/{id}/`

**Response:** Full order details with order items

### Create Order
`POST /api/v1/orders/`

**Request Body:**
```json
{
  "items": [
    {"product_id": 1, "quantity": 2},
    {"product_id": 3, "quantity": 5}
  ],
  "recipient_name": "John Doe",
  "recipient_phone": "01712345678",
  "recipient_address": "123 Main St",
  "recipient_city": "Dhaka",
  "recipient_area": "Gulshan",
  "recipient_postcode": "1212",
  "payment_method": "sslcommerz",
  "delivery_fee": 50.00,
  "notes": "Please deliver before 6 PM"
}
```

**Response:** Created order with full details

### Ship Order (Seller)
`PATCH /api/v1/orders/{id}/ship/`

**Permission:** Only sellers whose product is in the order

**Response:** Updated order with shipping information

### Track Order
`GET /api/v1/orders/{id}/track/`

**Response:** Tracking information for the order

### My Orders (Buyer)
`GET /api/v1/orders/my/`

**Permission:** Buyers only

**Response:** Current buyer's orders

### Seller Orders
`GET /api/v1/orders/seller/`

**Permission:** Sellers only

**Response:** Orders containing seller's products

## Filtering

Orders can be filtered by:
- `status` - Order status
- `payment_status` - Payment status
- `shipping_status` - Shipping status
- `payment_method` - Payment method
- `order_number` - Search in order number
- `recipient_name` - Search in recipient name
- `recipient_phone` - Search in phone number
- `created_after` - DateTime filter
- `created_before` - DateTime filter
- `min_amount` - Minimum total amount
- `max_amount` - Maximum total amount

## Permissions

- **Buyers**: Can create orders, view their own orders
- **Sellers**: Can view orders containing their products, update shipment status
- **Authentication**: Required for all operations

## SSLCommerz Integration (TODO)

The order model includes all necessary fields for SSLCommerz integration:
- Session key generation
- Transaction ID storage
- Validation ID after payment success
- Payment status tracking

## RedX Integration (TODO)

The order model includes all necessary fields for RedX integration:
- Order ID
- Tracking number
- Shipping status
- Delivery dates

