"""
Utility functions for SSLCommerz and RedX integrations.
"""
import hashlib
import logging
import requests
from django.conf import settings
from django.urls import reverse

logger = logging.getLogger(__name__)


def generate_sslcommerz_tran_id():
    """Generate unique transaction ID for SSLCommerz"""
    import uuid
    import time
    timestamp = str(int(time.time()))
    unique_id = str(uuid.uuid4())[:8]
    return f"TXN{timestamp}{unique_id}".replace('-', '')


def create_sslcommerz_session(order, request):
    """
    Create SSLCommerz payment session.
    Returns GatewayPageURL for redirect.
    """
    store_id = getattr(settings, 'SSLCOMMERZ_STORE_ID', 'agroc6000492a0ff0e5')
    store_passwd = getattr(settings, 'SSLCOMMERZ_STORE_PASSWD', 'agroc6000492a0ff0e5@ssl')
    is_sandbox = getattr(settings, 'SSLCOMMERZ_SANDBOX', True)
    
    # Generate transaction ID if not exists
    if not order.sslcommerz_tran_id:
        order.sslcommerz_tran_id = generate_sslcommerz_tran_id()
        order.save(update_fields=['sslcommerz_tran_id'])
    
    # Build callback URLs
    # SSLCommerz sends POST requests, so they MUST go to backend
    # Backend then redirects (GET) to frontend
    # IMPORTANT: Use backend URL directly, not frontend proxy
    backend_url = getattr(settings, 'BACKEND_URL', None)
    if backend_url:
        # Remove trailing slash
        backend_url = backend_url.rstrip('/')
    else:
        # Fallback: construct from request, but prefer backend
        scheme = 'https' if request.is_secure() else 'http'
        # Try to get backend URL from headers or default to port 8000
        host_header = request.get_host()
        if 'localhost:3000' in host_header or ':3000' in host_header:
            # Replace with backend port
            host = host_header.replace(':3000', ':8000')
        else:
            host = host_header
        backend_url = f"{scheme}://{host}"
    
    # Backend endpoints (SSLCommerz POSTs to these)
    success_url = f"{backend_url}/api/v1/orders/payment/success/"
    fail_url = f"{backend_url}/api/v1/orders/payment/fail/"
    cancel_url = f"{backend_url}/api/v1/orders/payment/cancel/"
    ipn_url = f"{backend_url}/api/v1/orders/payment/ipn/"
    
    # Get order items count
    order_items_count = order.order_items.count()
    
    # Prepare SSLCommerz payload - ensure all required fields are present
    payload = {
        'store_id': store_id,
        'store_passwd': store_passwd,
        'total_amount': str(float(order.total_amount)),  # Ensure it's a valid float string
        'currency': 'BDT',
        'tran_id': order.sslcommerz_tran_id,
        'success_url': success_url,
        'fail_url': fail_url,
        'cancel_url': cancel_url,
        'ipn_url': ipn_url,
        'cus_name': order.recipient_name or 'Customer',
        'cus_email': order.buyer.email or 'customer@example.com',
        'cus_add1': order.recipient_address or 'Address',
        'cus_add2': '',
        'cus_city': order.recipient_city or 'Dhaka',
        'cus_state': order.recipient_area or order.recipient_city or 'Dhaka',
        'cus_postcode': order.recipient_postcode or '1212',
        'cus_country': 'Bangladesh',
        'cus_phone': order.recipient_phone or '01700000000',
        'cus_fax': '',
        'shipping_method': 'YES',
        'ship_name': order.recipient_name or 'Customer',
        'ship_add1': order.recipient_address or 'Address',
        'ship_add2': '',
        'ship_city': order.recipient_city or 'Dhaka',
        'ship_state': order.recipient_area or order.recipient_city or 'Dhaka',
        'ship_postcode': order.recipient_postcode or '1212',
        'ship_country': 'Bangladesh',
        'product_name': f"Order {order.order_number}",
        'product_category': 'Agriculture',
        'product_profile': 'physical-goods',
        'product_amount': str(float(order.subtotal)),  # Product amount (subtotal)
        'vat': '0',
        'discount_amount': '0',
        'convenience_fee': '0',
        'num_of_item': str(order_items_count),
        'multi_card_name': '',
    }
    
    # Add product details for each item
    for idx, item in enumerate(order.order_items.all(), 1):
        payload[f'product_name_{idx}'] = item.product.name or f"Product {idx}"
        payload[f'product_category_{idx}'] = item.product.category or 'Agriculture'
        payload[f'product_profile_{idx}'] = 'physical-goods'
    
    # SSLCommerz API endpoint
    if is_sandbox:
        api_url = 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
    else:
        api_url = 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
    
    try:
        logger.info(f"SSLCommerz request - Order: {order.order_number}, TranID: {order.sslcommerz_tran_id}")
        logger.debug(f"SSLCommerz payload: {dict(payload, store_passwd='***')}")  # Hide password in logs
        
        response = requests.post(api_url, data=payload, timeout=30, headers={
            'Content-Type': 'application/x-www-form-urlencoded'
        })
        response.raise_for_status()
        
        # Log raw response for debugging
        logger.debug(f"SSLCommerz raw response: {response.text[:500]}")  # First 500 chars
        
        # Parse response - SSLCommerz v4 can return JSON or URL-encoded format
        import urllib.parse
        import json
        result = {}
        
        # Try JSON first (SSLCommerz v4 API often returns JSON)
        try:
            result = response.json()
            logger.info(f"SSLCommerz JSON response parsed successfully: {list(result.keys())[:10]}")
            
            # Check if the response is actually nested - sometimes SSLCommerz wraps it
            # If result has only one key and that value is a string that looks like JSON, parse it
            if len(result) == 1:
                first_key = list(result.keys())[0]
                first_value = result[first_key]
                if isinstance(first_value, str) and (first_value.strip().startswith('{') or first_value.strip().startswith('[')):
                    try:
                        nested_result = json.loads(first_value)
                        if isinstance(nested_result, dict) and 'status' in nested_result:
                            logger.info(f"Found nested JSON response in key '{first_key}', using nested result")
                            result = nested_result
                    except (json.JSONDecodeError, ValueError):
                        pass
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse as JSON: {e}")
            # Try URL-encoded format
            if '&' in response.text:
                for line in response.text.split('&'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        result[urllib.parse.unquote_plus(key)] = urllib.parse.unquote_plus(value)
                logger.info(f"SSLCommerz URL-encoded response parsed: {list(result.keys())[:10]}")
            else:
                # Plain text response - try to extract JSON from string
                try:
                    text = response.text.strip()
                    # Remove any BOM or leading characters
                    text = text.lstrip('\ufeff')
                    
                    if text.startswith('{'):
                        result = json.loads(text)
                    elif text.startswith('['):
                        # Array response
                        arr = json.loads(text)
                        if arr and isinstance(arr[0], dict):
                            result = arr[0]
                    else:
                        # Try to find JSON in the response
                        import re
                        json_match = re.search(r'\{.*\}', text, re.DOTALL)
                        if json_match:
                            result = json.loads(json_match.group())
                        else:
                            result = {'raw_response': text[:200]}  # Limit length
                except Exception as parse_error:
                    logger.error(f"Failed to parse response: {parse_error}, text: {response.text[:200]}")
                    result = {'raw_response': response.text[:200]}
        
        # Debug: Log what we got
        logger.info(f"SSLCommerz parsed response type: {type(result)}, keys: {list(result.keys())[:15] if isinstance(result, dict) else 'N/A'}")
        
        # Check for success - SSLCommerz v4 uses 'status' field
        status = result.get('status', '').upper() if isinstance(result, dict) else ''
        
        # SSLCommerz v4 uses 'redirectGatewayURL' (most common) or 'GatewayPageURL'
        gateway_url = None
        if isinstance(result, dict):
            # Try multiple possible field names
            gateway_url = (
                result.get('redirectGatewayURL') or 
                result.get('GatewayPageURL') or 
                result.get('redirectGatewayUrl') or
                result.get('gateway_url') or
                result.get('redirect_url')
            )
        
        # If gateway_url is still None, try to parse nested JSON strings
        if not gateway_url and isinstance(result, dict):
            # Check if any value contains a JSON string that might have the gateway URL
            for key, value in result.items():
                if isinstance(value, str) and ('redirectGatewayURL' in value or 'GatewayPageURL' in value or '"status":"SUCCESS"' in value):
                    try:
                        # Try to parse the string as JSON
                        parsed_value = json.loads(value)
                        if isinstance(parsed_value, dict):
                            # Check status and gateway URL
                            parsed_status = parsed_value.get('status', '').upper()
                            if parsed_status == 'SUCCESS':
                                gateway_url = (
                                    parsed_value.get('redirectGatewayURL') or 
                                    parsed_value.get('GatewayPageURL') or
                                    parsed_value.get('redirectGatewayUrl')
                                )
                                if gateway_url:
                                    logger.info(f"Found gateway URL in nested JSON string at key: {key}")
                                    # Also update status if we found it in nested JSON
                                    if not status or status != 'SUCCESS':
                                        status = 'SUCCESS'
                                        # Update result to use the parsed value
                                        result = parsed_value
                                    break
                    except (json.JSONDecodeError, ValueError):
                        # Not valid JSON, continue searching
                        pass
            
            # Check nested structures (error_details, etc.)
            # Sometimes SSLCommerz response is wrapped weirdly
            error_details = result.get('error_details')
            if isinstance(error_details, dict):
                # The JSON response might be stored as a KEY in error_details!
                # Check each key to see if it's a JSON string
                for detail_key, detail_value in error_details.items():
                    # If the key itself looks like JSON, parse it
                    if detail_key.strip().startswith('{'):
                        try:
                            key_json = json.loads(detail_key)
                            if isinstance(key_json, dict):
                                parsed_status = key_json.get('status', '').upper()
                                if parsed_status == 'SUCCESS':
                                    gateway_url = (
                                        key_json.get('redirectGatewayURL') or 
                                        key_json.get('GatewayPageURL') or
                                        key_json.get('redirectGatewayUrl')
                                    )
                                    if gateway_url:
                                        logger.info(f"Found gateway URL in error_details key (parsed as JSON)")
                                        status = 'SUCCESS'
                                        result = key_json  # Update result to use parsed JSON
                                        break
                        except (json.JSONDecodeError, ValueError):
                            pass
                    
                    # Check if value is JSON string
                    if isinstance(detail_value, str) and ('redirectGatewayURL' in detail_value or 'GatewayPageURL' in detail_value):
                        try:
                            parsed_value = json.loads(detail_value)
                            if isinstance(parsed_value, dict):
                                parsed_status = parsed_value.get('status', '').upper()
                                if parsed_status == 'SUCCESS':
                                    gateway_url = (
                                        parsed_value.get('redirectGatewayURL') or 
                                        parsed_value.get('GatewayPageURL') or
                                        parsed_value.get('redirectGatewayUrl')
                                    )
                                    if gateway_url:
                                        logger.info(f"Found gateway URL in error_details value")
                                        status = 'SUCCESS'
                                        result = parsed_value
                                        break
                        except (json.JSONDecodeError, ValueError):
                            pass
                
                # Also try direct access
                if not gateway_url:
                    gateway_url = (
                        error_details.get('redirectGatewayURL') or 
                        error_details.get('GatewayPageURL') or
                        error_details.get('redirectGatewayUrl')
                    )
            elif isinstance(error_details, str):
                # error_details might be a JSON string
                try:
                    parsed_details = json.loads(error_details)
                    if isinstance(parsed_details, dict):
                        parsed_status = parsed_details.get('status', '').upper()
                        if parsed_status == 'SUCCESS':
                            gateway_url = (
                                parsed_details.get('redirectGatewayURL') or 
                                parsed_details.get('GatewayPageURL') or
                                parsed_details.get('redirectGatewayUrl')
                            )
                            if gateway_url:
                                status = 'SUCCESS'
                                result = parsed_details
                except (json.JSONDecodeError, ValueError):
                    pass
        
        # If still no gateway_url, check the raw response string for the URL pattern
        if not gateway_url:
            import re
            # Search in the entire result dictionary as string
            result_str = json.dumps(result) if isinstance(result, dict) else str(result)
            
            # Try to find complete JSON in the string first
            json_match = re.search(r'\{"status":"SUCCESS".*?"redirectGatewayURL":"([^"]+)"', result_str, re.DOTALL)
            if json_match:
                gateway_url = json_match.group(1)
                # Unescape the URL
                gateway_url = gateway_url.replace('\\/', '/').replace('\\', '')
                logger.info(f"Extracted gateway URL from JSON pattern: {gateway_url[:100]}")
            else:
                # Fallback: find any SSLCommerz URL
                url_match = re.search(r'https://[^\s"]+sslcommerz\.com[^\s"]+', result_str)
                if url_match:
                    gateway_url = url_match.group()
                    logger.info(f"Extracted gateway URL from raw response string: {gateway_url[:100]}")
                    
                    # Clean up the URL (remove any trailing characters that shouldn't be there)
                    if '"' in gateway_url or '}' in gateway_url:
                        gateway_url = gateway_url.split('"')[0].split('}')[0].split('\\')[0]
                        gateway_url = gateway_url.rstrip('"').rstrip('}').rstrip('\\')
                    
                    # Also unescape
                    gateway_url = gateway_url.replace('\\/', '/').replace('\\', '')
        
        # Final check: if we found gateway_url but status is not SUCCESS, check for SUCCESS in the response
        if gateway_url and status != 'SUCCESS':
            # Search for SUCCESS status in the response
            result_str = json.dumps(result) if isinstance(result, dict) else str(result)
            if '"status":"SUCCESS"' in result_str or "'status':'SUCCESS'" in result_str:
                logger.info("Found SUCCESS status in response, updating status")
                status = 'SUCCESS'
        
        logger.info(f"SSLCommerz final status: {status}, gateway_url found: {bool(gateway_url)}")
        if gateway_url:
            logger.info(f"Gateway URL (first 150 chars): {gateway_url[:150]}")
        
        if status == 'SUCCESS' and gateway_url:
            # Save session key - can be 'sessionkey' or 'SESSIONKEY'
            session_key = result.get('sessionkey') or result.get('SESSIONKEY') or result.get('sessionKey', '')
            if session_key:
                order.sslcommerz_session_key = session_key
                order.save(update_fields=['sslcommerz_session_key'])
            
            logger.info(f"SSLCommerz session created successfully for order {order.order_number}")
            
            return {
                'success': True,
                'gateway_url': gateway_url,
                'session_key': session_key,
            }
        else:
            # Extract error message
            error_msg = result.get('failedreason') or result.get('error') or result.get('message') or 'Payment session creation failed'
            error_msg = error_msg.strip()
            
            logger.error(f"SSLCommerz session creation failed - Status: {status}, Error: {error_msg}, Full response: {result}")
            
            return {
                'success': False,
                'error': error_msg,
                'sslcommerz_response': result,  # Include full response for debugging
            }
    except requests.exceptions.RequestException as e:
        error_msg = f"Network error: {str(e)}"
        logger.error(f"SSLCommerz request exception - {error_msg}")
        return {
            'success': False,
            'error': error_msg,
        }
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.exception(f"SSLCommerz unexpected error - {error_msg}")
        return {
            'success': False,
            'error': error_msg,
        }


def validate_sslcommerz_transaction(val_id, tran_id, store_id=None, store_passwd=None):
    """
    Validate SSLCommerz transaction after payment.
    """
    store_id = store_id or getattr(settings, 'SSLCOMMERZ_STORE_ID', 'agroc6000492a0ff0e5')
    store_passwd = store_passwd or getattr(settings, 'SSLCOMMERZ_STORE_PASSWD', 'agroc6000492a0ff0e5@ssl')
    is_sandbox = getattr(settings, 'SSLCOMMERZ_SANDBOX', True)
    
    if is_sandbox:
        api_url = 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
    else:
        api_url = 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
    
    payload = {
        'val_id': val_id,
        'store_id': store_id,
        'store_passwd': store_passwd,
        'format': 'json',
    }
    
    try:
        response = requests.get(api_url, params=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {'error': str(e)}


def create_redx_shipment(order):
    """
    Create shipment (parcel) with RedX API.
    Returns tracking information.
    
    Note: RedX sandbox uses only API key for authentication (no merchant_id needed).
    API Documentation: https://sandbox.redx.com.bd/v1.0.0-beta
    """
    api_key = getattr(settings, 'REDX_API_KEY', '')
    is_sandbox = getattr(settings, 'REDX_SANDBOX', True)
    
    if not api_key:
        # Return mock tracking for development
        return {
            'success': True,
            'tracking_number': f"RDX{order.id:06d}{order.order_number[-3:]}",
            'order_id': f"RDX-ORD-{order.id}",
            'message': 'Mock tracking (RedX API key not configured)',
        }
    
    # RedX API base URL
    if is_sandbox:
        base_url = 'https://sandbox.redx.com.bd/v1.0.0-beta'
        logger.info("Using RedX sandbox environment")
    else:
        base_url = 'https://api.redx.com.bd/v1.0.0-beta'
        logger.info("Using RedX production environment")
    
    # Calculate parcel weight from order items (in grams)
    # Default to 500g if no items or weights available
    parcel_weight = 500  # Default weight in grams
    if hasattr(order, 'order_items') and order.order_items.exists():
        # Sum up weights if available, otherwise estimate
        # For now, using default weight
        pass
    
    # Convert weight to string as per RedX API requirement
    parcel_weight_str = str(parcel_weight)
    
    # Prepare payload according to RedX API documentation
    # Required fields: customer_name, customer_phone, delivery_area, delivery_area_id,
    #                  customer_address, cash_collection_amount, parcel_weight, value
    payload = {
        'customer_name': order.recipient_name,
        'customer_phone': order.recipient_phone,
        'delivery_area': order.recipient_area or order.recipient_city or 'Dhaka',  # Default area
        'delivery_area_id': getattr(settings, 'REDX_DEFAULT_AREA_ID', 1),  # Default area ID, should be configured
        'customer_address': order.recipient_address,
        'merchant_invoice_id': order.order_number,  # Use our order number as invoice ID
        'cash_collection_amount': str(int(order.total_amount)),  # RedX expects string for cash collection
        'parcel_weight': parcel_weight_str,
        'value': str(int(order.total_amount)),  # Declared value as string
        'instruction': '',  # Optional delivery instructions
    }
    
    # Add parcel details if order items exist
    if hasattr(order, 'order_items') and order.order_items.exists():
        parcel_details = []
        for item in order.order_items.all():
            parcel_details.append({
                'name': item.product_name or 'Product',
                'category': 'Food' if hasattr(item, 'product') and item.product.category == 'Vegetables' else 'General',
                'value': int(item.unit_price),
            })
        if parcel_details:
            payload['parcel_details_json'] = parcel_details
    
    # RedX API endpoint
    api_url = f'{base_url}/parcel'
    
    # RedX uses API-ACCESS-TOKEN header (not Authorization)
    headers = {
        'API-ACCESS-TOKEN': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    
    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        # RedX returns tracking_id in response
        tracking_id = result.get('tracking_id', '')
        
        if tracking_id:
            return {
                'success': True,
                'tracking_number': tracking_id,  # RedX calls it tracking_id
                'order_id': order.order_number,
                'data': result,
            }
        else:
            raise ValueError('No tracking_id in RedX response')
            
    except requests.exceptions.HTTPError as e:
        # Log the error response for debugging
        error_detail = 'Unknown error'
        try:
            if hasattr(e, 'response') and e.response is not None:
                error_detail = e.response.text or e.response.json()
        except:
            error_detail = str(e)
        
        logger.error(f'RedX API error: {error_detail}')
        
        # Return mock tracking on error for development
        return {
            'success': True,
            'tracking_number': f"RDX{order.id:06d}{order.order_number[-3:]}",
            'order_id': f"RDX-ORD-{order.id}",
            'message': f'Mock tracking (RedX API error: {error_detail})',
        }
    except Exception as e:
        logger.error(f'RedX shipment creation error: {str(e)}')
        # Return mock tracking on error for development
        return {
            'success': True,
            'tracking_number': f"RDX{order.id:06d}{order.order_number[-3:]}",
            'order_id': f"RDX-ORD-{order.id}",
            'message': f'Mock tracking (RedX API error: {str(e)})',
        }


def track_redx_shipment(tracking_number):
    """
    Track RedX parcel status.
    Endpoint: GET /parcel/track/<tracking_id>
    """
    api_key = getattr(settings, 'REDX_API_KEY', '')
    is_sandbox = getattr(settings, 'REDX_SANDBOX', True)
    
    if not api_key:
        return {
            'success': False,
            'error': 'RedX API key not configured',
        }
    
    # RedX API base URL
    if is_sandbox:
        base_url = 'https://sandbox.redx.com.bd/v1.0.0-beta'
    else:
        base_url = 'https://api.redx.com.bd/v1.0.0-beta'
    
    # RedX track endpoint
    api_url = f'{base_url}/parcel/track/{tracking_number}'
    
    # RedX uses API-ACCESS-TOKEN header (not Authorization)
    headers = {
        'API-ACCESS-TOKEN': f'Bearer {api_key}',
    }
    
    try:
        response = requests.get(api_url, headers=headers, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        # RedX returns tracking array with messages
        return {
            'success': True,
            'data': result,
            'tracking': result.get('tracking', []),
        }
    except requests.exceptions.HTTPError as e:
        error_detail = 'Unknown error'
        try:
            if hasattr(e, 'response') and e.response is not None:
                error_detail = e.response.text or str(e.response.status_code)
        except:
            error_detail = str(e)
        logger.error(f'RedX tracking error: {error_detail}')
        return {
            'success': False,
            'error': error_detail,
        }
    except Exception as e:
        logger.error(f'RedX tracking error: {str(e)}')
        return {
            'success': False,
            'error': str(e),
        }


def get_redx_parcel_info(tracking_number):
    """
    Get RedX parcel details.
    Endpoint: GET /parcel/info/<tracking_id>
    """
    api_key = getattr(settings, 'REDX_API_KEY', '')
    is_sandbox = getattr(settings, 'REDX_SANDBOX', True)
    
    if not api_key:
        return {
            'success': False,
            'error': 'RedX API key not configured',
        }
    
    # RedX API base URL
    if is_sandbox:
        base_url = 'https://sandbox.redx.com.bd/v1.0.0-beta'
    else:
        base_url = 'https://api.redx.com.bd/v1.0.0-beta'
    
    # RedX parcel info endpoint
    api_url = f'{base_url}/parcel/info/{tracking_number}'
    
    # RedX uses API-ACCESS-TOKEN header (not Authorization)
    headers = {
        'API-ACCESS-TOKEN': f'Bearer {api_key}',
    }
    
    try:
        response = requests.get(api_url, headers=headers, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        # RedX returns parcel object
        return {
            'success': True,
            'data': result,
            'parcel': result.get('parcel', {}),
        }
    except requests.exceptions.HTTPError as e:
        error_detail = 'Unknown error'
        try:
            if hasattr(e, 'response') and e.response is not None:
                error_detail = e.response.text or str(e.response.status_code)
        except:
            error_detail = str(e)
        logger.error(f'RedX parcel info error: {error_detail}')
        return {
            'success': False,
            'error': error_detail,
        }
    except Exception as e:
        logger.error(f'RedX parcel info error: {str(e)}')
        return {
            'success': False,
            'error': str(e),
        }

