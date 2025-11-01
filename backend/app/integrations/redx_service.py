import os
import requests
from django.conf import settings

API_BASE_URL = "https://sandbox.redx.com.bd/v1.0.0-beta"

def get_redx_headers():
    """
    Returns the headers required for REDX API requests.
    """
    return {
        'Authorization': f"Bearer {os.environ.get('REDX_API_TOKEN')}",
        'Content-Type': 'application/json',
    }

def book_delivery(order, recipient_name, recipient_phone, recipient_address):
    """
    Books a delivery with REDX for a given order.
    """
    headers = get_redx_headers()

    payload = {
        "customer_name": recipient_name,
        "customer_phone": recipient_phone,
        "delivery_area": "Dhaka", # This would likely need to be more dynamic
        "delivery_area_id": 1, # Placeholder
        "customer_address": recipient_address,
        "merchant_invoice_id": f"AGRO-{order.id}",
        "cash_collection_amount": order.total_price, # Assuming cash on delivery
        "parcel_weight": 1, # Placeholder, could be calculated
        "instruction": "Handle with care",
        "value": order.total_price, # Declared value of the parcel
    }

    try:
        response = requests.post(f"{API_BASE_URL}/parcel", headers=headers, json=payload)
        response.raise_for_status() # Raise an exception for bad status codes

        data = response.json()
        tracking_id = data.get('tracking_id')
        print(f"Successfully booked delivery for order {order.id}. Tracking ID: {tracking_id}")
        return tracking_id

    except requests.exceptions.RequestException as e:
        print(f"Error booking delivery with REDX: {e}")
        return None
