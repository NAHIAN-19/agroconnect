from rest_framework.permissions import BasePermission

class IsAdminVerified(BasePermission):
    """
    Allows access only to users who have been verified by an admin.
    """
    message = "Your account has not been verified by an administrator yet."

    def has_permission(self, request, view):
        # Assumes user is authenticated (use `IsAuthenticated` first)
        return request.user and request.user.is_admin_verified


class IsSeller(BasePermission):
    """
    Allows access only to users with the 'Seller' role.
    """
    message = "You do not have permission as a seller."

    def has_permission(self, request, view):
        return request.user and request.user.is_seller
    
class IsProfileCompleted(BasePermission):
    """
    Allows access only to users who HAVE completed their profile.
    This is the opposite of IsNotProfileCompleted.
    """
    message = "You must complete your onboarding profile to access this."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Check the flag from your User model
        return request.user.is_profile_completed
    
class IsEmailVerified(BasePermission):
    """
    Allows access only to users who have verified their email.
    """
    message = "Your email address is not verified."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_email_verified

class IsNotProfileCompleted(BasePermission):
    """
    Allows access only to users who have NOT yet completed their profile.
    This prevents re-running the onboarding process.
    """
    message = "Your profile is already completed."

    def has_permission(self, request, view):
        # We must check is_authenticated first
        if not request.user.is_authenticated:
            return False
            
        return not request.user.is_profile_completed