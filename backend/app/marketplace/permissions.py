from rest_framework import permissions


class IsFarmer(permissions.BasePermission):
    """
    Allows access only to users with the 'Farmer' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'FARMER'


class IsBuyer(permissions.BasePermission):
    """
    Allows access only to users with the 'Buyer' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'BUYER'
