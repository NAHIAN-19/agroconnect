"""
Utility functions and classes for Authentication API.
Implements helper functions, response formatting.
"""

import logging
import time
from typing import Any, Dict, Optional

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

#from utils.tasks import write_log_entry_task


logger = logging.getLogger("apps")


class APIResponse:
    """
    Standardized API response formatter.
    Implements consistent response structure across all endpoints.
    """

    DEFAULT_RESPONSE_FORMAT = {
        "SUCCESS": {"status": "success", "message": "Operation successful."},
        "ERROR": {"status": "error", "message": "An error occurred."},
    }

    @staticmethod
    def _format_response(
        status_type: str,
        message: Optional[str] = None,
        data: Any = None,
        errors: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Format response according to API standards.
        """
        response_format = getattr(
            settings, "API_RESPONSE_FORMAT", APIResponse.DEFAULT_RESPONSE_FORMAT
        )
        base_format = response_format.get(status_type.upper(), {})

        return {
            "status": base_format.get("status", status_type.lower()),
            "message": message or base_format.get("message"),
            "data": data,
            "errors": errors,
        }

    @staticmethod
    def success(
        message: str = "Operation successful",
        data: Any = None,
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        """
        Return a success response.
        """
        response_data = APIResponse._format_response("SUCCESS", message, data)
        return Response(response_data, status=status_code)

    @staticmethod
    def error(
        message: str = "Operation failed",
        errors: Dict = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        data: Any = None,
    ) -> Response:
        """
        Return an error response.
        """
        response_data = APIResponse._format_response("ERROR", message, data, errors)
        return Response(response_data, status=status_code)

    @staticmethod
    def validation_error(errors: Dict, message: str = "Validation failed") -> Response:
        """
        Return a validation error response.
        """
        return APIResponse.error(message, errors, status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def unauthorized(message: str = "Authentication required") -> Response:
        """
        Return an unauthorized response.
        """
        return APIResponse.error(message, status_code=status.HTTP_401_UNAUTHORIZED)

    @staticmethod
    def forbidden(message: str = "Access denied") -> Response:
        """
        Return a forbidden response.
        """
        return APIResponse.error(message, status_code=status.HTTP_403_FORBIDDEN)

    @staticmethod
    def not_found(message: str = "Resource not found") -> Response:
        """
        Return a not found response.
        """
        return APIResponse.error(message, status_code=status.HTTP_404_NOT_FOUND)

    @staticmethod
    def server_error(message: str = "Internal server error") -> Response:
        """
        Return a server error response.
        """
        return APIResponse.error(
            message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def get_client_ip(request) -> str:
    """
    Get the client IP address from request.
    Handles proxy and load balancer headers.
    """
    # Check for IP in headers (for load balancers/proxies)
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
        return ip

    # Check for real IP header
    x_real_ip = request.META.get("HTTP_X_REAL_IP")
    if x_real_ip:
        return x_real_ip.strip()

    # Fallback to REMOTE_ADDR
    return request.META.get("REMOTE_ADDR", "0.0.0.0")


def sanitize_request_data(data: dict) -> dict:
    """Mask sensitive fields before logging."""
    sensitive_fields = {"password", "token", "secret", "authorization", "refresh", "access"}
    
    if not isinstance(data, dict):
        return "Invalid data format"
        
    return {k: ("***" if k.lower() in sensitive_fields else v) for k, v in data.items()}

# class RequestLogger:
#     """
#     Utility for logging API requests and responses as structured JSON.
#     This class is designed to be called by the APILoggingMixin and
#     offloads all logging to a Celery task.
#     """

#     @staticmethod
#     def log_request(request: Any, view_name: str) -> float:
#         """
#         Builds the request log data and dispatches it to Celery.
#         Returns the start time for timing the response.
#         """
#         start_time = time.time()
#         try:
#             log_data = {
#                 "event": "api_request",
#                 "view": view_name,
#                 "method": request.method,
#                 "path": request.path,
#                 "ip_address": get_client_ip(request),
#                 "user_agent": request.META.get("HTTP_USER_AGENT", ""),
#                 "user_id": getattr(request.user, "id", None) if request.user.is_authenticated else None,
#             }
#             if request.data:
#                 log_data["payload"] = sanitize_request_data(dict(request.data))

#             # Dispatch to Celery
#             write_log_entry_task.delay("info", log_data)
            
#         except Exception as e:
#             # If logging fails, dispatch the logging error but don't crash the request
#             write_log_entry_task.delay("error", {"event": "log_request_failed", "error": str(e)})

#         return start_time

    @staticmethod
    def log_response(request: Any, view_name: str, status_code: int, start_time: float):
        """
        Builds the response log data and dispatches it to Celery.
        """
        try:
            elapsed_time = round((time.time() - start_time) * 1000, 2)  # ms
            log_data = {
                "event": "api_response",
                "view": view_name,
                "status_code": status_code,
                "ip_address": get_client_ip(request),
                "user_id": getattr(request.user, "id", None) if request.user.is_authenticated else None,
                "execution_time_ms": elapsed_time,
            }
            
            log_level = "warning" if status_code >= 400 else "info"

            # Dispatch to Celery
            write_log_entry_task.delay(log_level, log_data)
            
        except Exception as e:
            # If logging fails, dispatch the logging error
            write_log_entry_task.delay("error", {"event": "log_response_failed", "error": str(e)})


def normalize_email(email):
    """
    Normalizes an email address to a canonical form.

    - Converts the domain part to lowercase.
    - For 'gmail.com' and 'googlemail.com' domains, it:
        - Removes all dots ('.') from the local part.
        - Removes the "plus" part (e.g., 'user+tag' becomes 'user').
    - Converts the local part to lowercase.
    
    Returns the normalized email as a string, or None if the format is invalid.
    """
    if not email or '@' not in email:
        logger.warning(f"Invalid email format provided for normalization: {email}")
        return None

    try:
        # 1. Split the email into the local part and the domain part
        local_part, domain = email.rsplit('@', 1)

        # 2. Make the domain lowercase (domains are case-insensitive)
        domain = domain.lower()

        # 3. If it's a Gmail account, normalize the local part
        if domain in ('gmail.com', 'googlemail.com'):
            # Bonus: Remove the "plus" part first
            # e.g., 'jhondoe19+newsletters' becomes 'jhondoe19'
            local_part = local_part.split('+', 1)[0]
            
            # Remove all dots from the remaining local part
            local_part = local_part.replace('.', '')

        # 4. Re-assemble and return the normalized email
        # The local part is also lowercased for consistency, as most
        # providers treat it as case-insensitive.
        return f"{local_part.lower()}@{domain}"

    except Exception as e:
        logger.error(f"Error normalizing email '{email}': {e}")
        return None

