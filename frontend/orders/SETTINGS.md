# SSLCommerz and RedX Configuration

## Environment Variables

Add these to your Django `settings.py` or `.env` file:

### SSLCommerz Settings

```python
# SSLCommerz Configuration
SSLCOMMERZ_STORE_ID = 'your_store_id'  # Get from SSLCommerz dashboard
SSLCOMMERZ_STORE_PASSWD = 'your_store_password'  # Get from SSLCommerz dashboard
SSLCOMMERZ_SANDBOX = True  # Set to False for production

# Frontend URL (for payment callbacks)
FRONTEND_URL = 'http://localhost:3000'  # Change to production URL
```

### RedX Settings

```python
# RedX Configuration
REDX_API_KEY = 'your_long_api_key'  # Get from RedX sandbox/production
REDX_SANDBOX = True  # Set to False for production
REDX_DEFAULT_AREA_ID = 1  # Default delivery area ID (check RedX area list)
```

**Note:** 
- RedX sandbox only requires an API key (no merchant_id needed).
- `REDX_DEFAULT_AREA_ID` should match a valid delivery area ID from RedX. You can get area IDs from RedX documentation or API.
- The system will work with just the API key. If area ID is not configured, it defaults to 1.

## SSLCommerz Sandbox Credentials

For testing, you can use SSLCommerz sandbox:

**Test Store ID:** `agroc6000492a0ff0e5` (provided in code as default)
**Test Store Password:** `agroc6000492a0ff0e5@ssl` (provided in code as default)

**Test Cards:**
- VISA: `4111111111111111`
- Mastercard: `5111111111111111`
- Expiry: `12/25`
- CVV: `111`
- Mobile OTP: `111111` or `123456`

## RedX Integration

RedX API endpoints:
- **Sandbox:** `https://sandbox.redx.com.bd/v1.0.0-beta`
- **Production:** `https://api.redx.com.bd/v1.0.0-beta`

**Endpoints:**
- Create Parcel: `POST /parcel`
- Track Parcel: `GET /parcel/track/<tracking_id>`
- Get Parcel Info: `GET /parcel/info/<tracking_id>`

**Authentication:**
- Uses API key only (no merchant_id needed)
- Header: `API-ACCESS-TOKEN: Bearer {api_key}` (not `Authorization`)
- Sandbox and production use the same authentication method

**Required Settings:**
- `REDX_API_KEY`: Your RedX API key (long token)
- `REDX_DEFAULT_AREA_ID`: Delivery area ID (integer, e.g., 1 for default area)
- `REDX_SANDBOX`: `True` for sandbox, `False` for production

**Note:** If RedX API key is not configured, the system will generate mock tracking numbers for development.

## Required Settings in Django settings.py

```python
# Add to INSTALLED_APPS
INSTALLED_APPS = [
    # ... other apps
    'orders',
]

# Add to MIDDLEWARE (if using CSRF exemption)
MIDDLEWARE = [
    # ... other middleware
    'django.middleware.csrf.CsrfViewMiddleware',
]

# CORS settings (if frontend is on different domain)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

## Install Required Packages

```bash
pip install requests
```

Requests is used for API calls to SSLCommerz and RedX.

## Testing

1. Use SSLCommerz sandbox credentials for testing payments
2. Use test card numbers provided above
3. Mock RedX tracking numbers will be generated if credentials aren't set
4. Test payment flow:
   - Create order → Initiate payment → Redirect to SSLCommerz → Complete payment → Redirect back

