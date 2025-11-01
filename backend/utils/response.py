from rest_framework.response import Response


class APIResponse(Response):
    def __init__(self, status='success', status_code=None, message=None, data=None, errors=None):
        payload = {
            'status': status,
            'status_code': status_code,
            'message': message,
            'data': data or {},
            'errors': errors or {}
        }
        super().__init__(data=payload, status=status_code)

    @classmethod
    def success(cls, status_code=200, message="Success", data=None):
        return cls(status='success', status_code=status_code, message=message, data=data)

    @classmethod
    def error(cls, status_code=400, message="Error", errors=None):
        return cls(status='error', status_code=status_code, message=message, errors=errors)
