"""
Payment views for SSLCommerz integration.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import redirect
from django.conf import settings
from django.utils import timezone
import json

from utils.response import APIResponse
from .models import Order
from .utils import create_sslcommerz_session, validate_sslcommerz_transaction

# Get FRONTEND_URL from settings
def get_frontend_url():
    """Get frontend URL from settings, removing trailing slash"""
    url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    return url.rstrip('/')

FRONTEND_URL = get_frontend_url()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request, order_id):
    """
    Initiate SSLCommerz payment session for an order.
    POST /api/v1/orders/{order_id}/payment/initiate/
    """
    try:
        order = Order.objects.get(id=order_id, buyer=request.user)
        
        # Check if order is already paid
        if order.payment_status == 'success':
            return APIResponse.error(
                message="Order is already paid",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Create payment session
        result = create_sslcommerz_session(order, request)
        
        if result['success']:
            return APIResponse.success(
                message="Payment session created successfully",
                data={
                    'gateway_url': result['gateway_url'],
                    'order_id': order.id,
                    'order_number': order.order_number,
                }
            )
        else:
            # Include more details in error response for debugging
            error_message = result.get('error', 'Failed to create payment session')
            sslcommerz_response = result.get('sslcommerz_response', {})
            
            return APIResponse.error(
                message=f"Payment session creation failed: {error_message}",
                data={
                    'error_details': sslcommerz_response,
                    'order_id': order.id,
                    'order_number': order.order_number,
                } if sslcommerz_response else {
                    'order_id': order.id,
                    'order_number': order.order_number,
                },
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    except Order.DoesNotExist:
        return APIResponse.error(
            message="Order not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return APIResponse.error(
            message=f"Error initiating payment: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
def payment_success(request):
    """
    Handle successful payment redirect from SSLCommerz.
    SSLCommerz sends POST with form data, but can also send GET.
    GET/POST /api/v1/orders/payment/success/
    """
    # SSLCommerz sends POST with form-encoded data
    tran_id = request.POST.get('tran_id') or request.GET.get('tran_id')
    val_id = request.POST.get('val_id') or request.GET.get('val_id')
    
    if not tran_id:
        frontend_url = get_frontend_url()
        return redirect(f"{frontend_url}/payment/failed?error=missing_tran_id")
    
    try:
        order = Order.objects.get(sslcommerz_tran_id=tran_id)
        
        # Validate transaction
        if val_id:
            validation_result = validate_sslcommerz_transaction(val_id, tran_id)
            
            if validation_result.get('status') == 'VALID' or validation_result.get('status') == 'VALIDATED':
                # Update order payment status
                order.payment_status = 'success'
                order.status = Order.StatusChoices.PAID
                order.sslcommerz_val_id = val_id
                order.payment_date = timezone.now()
                order.save()
                
                frontend_url = get_frontend_url()
                return redirect(f"{frontend_url}/payment/success?order_id={order.id}&order_number={order.order_number}")
            else:
                # Validation failed but payment might have succeeded
                order.payment_status = 'pending_validation'
                order.save()
                
        frontend_url = get_frontend_url()
        return redirect(f"{frontend_url}/payment/success?order_id={order.id}&order_number={order.order_number}")
    except Order.DoesNotExist:
        frontend_url = get_frontend_url()
        return redirect(f"{frontend_url}/payment/failed?error=order_not_found")
    except Exception as e:
        frontend_url = get_frontend_url()
        return redirect(f"{frontend_url}/payment/failed?error={str(e)}")


@csrf_exempt
def payment_fail(request):
    """
    Handle failed payment redirect from SSLCommerz.
    SSLCommerz sends POST with form data, but can also send GET.
    GET/POST /api/v1/orders/payment/fail/
    """
    # SSLCommerz sends POST with form-encoded data
    tran_id = request.POST.get('tran_id') or request.GET.get('tran_id')
    error = request.POST.get('error') or request.GET.get('error', 'Payment failed')
    
    if tran_id:
        try:
            order = Order.objects.get(sslcommerz_tran_id=tran_id)
            order.payment_status = 'failed'
            order.save()
        except Order.DoesNotExist:
            pass
    
    frontend_url = get_frontend_url()
    return redirect(f"{frontend_url}/payment/failed?error={error}&tran_id={tran_id}")


@csrf_exempt
def payment_cancel(request):
    """
    Handle cancelled payment redirect from SSLCommerz.
    SSLCommerz sends POST with form data, but can also send GET.
    GET/POST /api/v1/orders/payment/cancel/
    """
    # SSLCommerz sends POST with form-encoded data
    tran_id = request.POST.get('tran_id') or request.GET.get('tran_id')
    status_val = request.POST.get('status') or request.GET.get('status', 'CANCELLED')
    
    if tran_id:
        try:
            order = Order.objects.get(sslcommerz_tran_id=tran_id)
            if status_val == 'CANCELLED':
                order.payment_status = 'cancelled'
            elif status_val == 'FAILED':
                order.payment_status = 'failed'
            order.save()
        except Order.DoesNotExist:
            pass
    
    frontend_url = get_frontend_url()
    return redirect(f"{frontend_url}/payment/cancelled?tran_id={tran_id}")


@csrf_exempt
def payment_ipn(request):
    """
    Handle Instant Payment Notification (IPN) from SSLCommerz.
    POST /api/v1/orders/payment/ipn/
    """
    if request.method != 'POST':
        return Response({'error': 'Method not allowed'}, status=405)
    
    try:
        # Parse IPN data
        tran_id = request.POST.get('tran_id')
        val_id = request.POST.get('val_id')
        status_val = request.POST.get('status')
        
        if not tran_id:
            return Response({'error': 'Missing tran_id'}, status=400)
        
        order = Order.objects.get(sslcommerz_tran_id=tran_id)
        
        # Update order based on IPN status
        if status_val == 'VALID':
            # Validate transaction
            validation_result = validate_sslcommerz_transaction(val_id, tran_id)
            
            if validation_result.get('status') == 'VALID' or validation_result.get('status') == 'VALIDATED':
                order.payment_status = 'success'
                order.status = Order.StatusChoices.PAID
                order.sslcommerz_val_id = val_id
                order.payment_date = timezone.now()
                order.save()
                
                return Response({'status': 'updated'})
        
        elif status_val == 'FAILED':
            order.payment_status = 'failed'
            order.save()
            return Response({'status': 'updated'})
        
        elif status_val == 'CANCELLED':
            order.payment_status = 'cancelled'
            order.save()
            return Response({'status': 'updated'})
        
        return Response({'status': 'no_change'})
        
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

