from rest_framework.pagination import PageNumberPagination
from utils.response import APIResponse


class OrderPagination(PageNumberPagination):
    """Custom pagination for Order list views"""
    
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        """Return paginated response in APIResponse format"""
        return APIResponse.success(
            message="Orders retrieved successfully",
            data={
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'results': data
            }
        )

