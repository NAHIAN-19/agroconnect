from rest_framework.views import exception_handler
from rest_framework import status
from utils.response import APIResponse

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        errors = response.data if isinstance(response.data, dict) else {"non_field_errors": [str(exc)]}

        # Decide message based on status code
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            message = "Validation error"
        elif response.status_code == status.HTTP_403_FORBIDDEN:
            message = "Permission denied"
        else:
            message = str(exc)

        return APIResponse.error(
            message=message,
            errors=errors,
            status_code=response.status_code
        )

    return response