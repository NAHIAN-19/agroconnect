from rest_framework.pagination import PageNumberPagination
from django.conf import settings
from utils.response import APIResponse

class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for product and review listings.
    """
    page_size = getattr(settings, 'PAGE_SIZE', 20)
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        """Return paginated response with metadata"""
        from rest_framework.response import Response
        
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page_size': self.page_size,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data,
        })

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

