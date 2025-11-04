from rest_framework import permissions


class IsBuyer(permissions.BasePermission):
    """Permission class: Only buyers can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'BUYER'
        )


class IsBuyerOrReadOnly(permissions.BasePermission):
    """
    Permission class: Only buyers can create orders.
    For other operations, users must be authenticated.
    Requires admin verification for creating orders.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Only verified buyers can create orders
        if request.method == 'POST':
            return (
                request.user and
                request.user.is_authenticated and
                request.user.role == 'BUYER' and
                getattr(request.user, 'is_admin_verified', False) is True
            )
        
        return request.user and request.user.is_authenticated


class IsOrderOwnerOrSeller(permissions.BasePermission):
    """
    Permission class: Users can access orders if they are:
    1. The buyer (order owner)
    2. A seller whose product is in the order
    """
    
    def has_object_permission(self, request, view, obj):
        # Buyers can access their own orders
        if obj.buyer == request.user:
            return True
        
        # Sellers can access orders containing their products
        if request.user.role == 'SELLER':
            seller_ids = obj.seller_ids
            return request.user.id in seller_ids
        
        return False


class IsSellerForShipment(permissions.BasePermission):
    """
    Permission class: Only sellers whose product is in the order
    can update shipment status.
    """
    
    def has_object_permission(self, request, view, obj):
        if request.method not in ['PATCH', 'PUT']:
            return True
        
        # Only sellers can update shipment
        if request.user.role != 'SELLER':
            return False
        
        # Seller must have a product in this order
        seller_ids = obj.seller_ids
        return request.user.id in seller_ids

class IsSeller(permissions.BasePermission):
    """Permission class: Only sellers can access"""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'SELLER'
        )
