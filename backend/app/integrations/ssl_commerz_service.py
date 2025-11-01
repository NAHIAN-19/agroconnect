import os
from sslcommerz_lib import SSLCOMMERZ
from django.conf import settings

def get_sslcommerz_instance():
    """
    Returns an instance of the SSLCOMMERZ class, configured for the sandbox.
    """
    sslcz = SSLCOMMERZ({
        'store_id': os.environ.get('SSLCOMMERZ_STORE_ID'),
        'store_pass': os.environ.get('SSLCOMMERZ_STORE_PASS'),
        'issandbox': True
    })
    return sslcz

def initiate_payment(order, amount, user):
    """
    Initiates a payment request to SSLCommerz.
    """
    sslcz = get_sslcommerz_instance()

    post_body = {
        'total_amount': amount,
        'currency': "BDT",
        'tran_id': f"agro_{order.id}",
        'success_url': f"{settings.SITE_URL}/payment/success/",
        'fail_url': f"{settings.SITE_URL}/payment/fail/",
        'cancel_url': f"{settings.SITE_URL}/payment/cancel/",
        'emi_option': 0,
        'cus_name': f"{user.first_name} {user.last_name}",
        'cus_email': user.email,
        'cus_add1': 'Dhaka', # Placeholder
        'cus_city': 'Dhaka', # Placeholder
        'cus_country': 'Bangladesh',
        'cus_phone': user.phone_number,
        'shipping_method': "NO",
        'product_name': 'AgroConnect Order',
        'product_category': 'Food',
        'product_profile': 'general',
    }

    response = sslcz.createSession(post_body)

    if response.get('status') == 'SUCCESS':
        return response.get('GatewayPageURL')
    else:
        # Handle the error appropriately
        print(f"Failed to create SSLCommerz session: {response}")
        return None

def handle_payment_webhook(data):
    """
    Handles the payment notification webhook from SSLCommerz.
    """
    sslcz = get_sslcommerz_instance()
    if sslcz.validation(data):
        # The data is valid, process the payment status
        tran_id = data.get('tran_id')
        status = data.get('status')
        # Here you would find the order by tran_id and update its status
        print(f"Transaction {tran_id} status is {status}")
    else:
        # The data is not valid
        print("Webhook validation failed.")
