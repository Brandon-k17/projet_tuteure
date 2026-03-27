"""
Classes de pagination personnalisées
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPagination(PageNumberPagination):
    """
    Pagination personnalisée avec informations détaillées
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.page_size,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })


class SmallResultSetPagination(PageNumberPagination):
    """
    Pagination pour petits ensembles de résultats
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class LargeResultSetPagination(PageNumberPagination):
    """
    Pagination pour grands ensembles de résultats
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
