from rest_framework import permissions
from apps.users.models import User


class IsSellerOrReadOnly(permissions.BasePermission):
    """
    Permission class: Only sellers can create/update/delete products.
    Others can only read.
    Requires admin verification for write operations.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to authenticated, verified sellers
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.RoleChoices.SELLER and
            getattr(request.user, 'is_admin_verified', False) is True
        )

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the product's owner (seller)
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.RoleChoices.SELLER and
            obj.seller == request.user
        )


class IsBuyerOrReadOnly(permissions.BasePermission):
    """
    Permission class: Only buyers can create reviews.
    Others can only read.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to authenticated buyers
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.RoleChoices.BUYER
        )

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the review's owner (buyer)
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.RoleChoices.BUYER and
            obj.buyer == request.user
        )


class IsSellerOwner(permissions.BasePermission):
    """
    Permission class: Only the seller can access their own products.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.RoleChoices.SELLER
        )

    def has_object_permission(self, request, view, obj):
        return obj.seller == request.user

