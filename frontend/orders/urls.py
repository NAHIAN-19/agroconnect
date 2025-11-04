from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet
from .payment_views import (
    initiate_payment,
    payment_success,
    payment_fail,
    payment_cancel,
    payment_ipn
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

app_name = 'orders'

urlpatterns = [
    path('', include(router.urls)),
    # Payment endpoints
    path('orders/<int:order_id>/payment/initiate/', initiate_payment, name='initiate-payment'),
    path('orders/payment/success/', payment_success, name='payment-success'),
    path('orders/payment/fail/', payment_fail, name='payment-fail'),
    path('orders/payment/cancel/', payment_cancel, name='payment-cancel'),
    path('orders/payment/ipn/', payment_ipn, name='payment-ipn'),
]

