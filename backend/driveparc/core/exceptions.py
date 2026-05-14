"""
Gestion personnalisée des exceptions
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
import traceback


def custom_exception_handler(exc, context):
    from rest_framework.views import exception_handler
    response = exception_handler(exc, context)
    
    # TEMPORAIRE — expose l'erreur réelle pour debug
    import traceback
    traceback.print_exc()  # ← affiche la vraie erreur dans le terminal Django
    
    if response is not None:
        return Response({
            "success": False,
            "error": {
                "code": response.status_code,
                "message": "Une erreur s'est produite",
                "detail": response.data,  # ← AJOUTE ÇA temporairement
            }
        }, status=response.status_code)
    
    # Erreur non gérée (500)
    return Response({
        "success": False,
        "error": {
            "code": 500,
            "message": str(exc),  # ← AJOUTE ÇA temporairement
        }
    }, status=500)

class BusinessLogicException(Exception):
    def __init__(self, message, code='BUSINESS_ERROR'):
        self.message = message
        self.code = code
        super().__init__(self.message)


class ResourceNotFoundException(Exception):
    def __init__(self, resource_name, resource_id=None):
        self.resource_name = resource_name
        self.resource_id = resource_id
        message = f"{resource_name} non trouvé"
        if resource_id:
            message += f" (ID: {resource_id})"
        super().__init__(message)


class PermissionDeniedException(Exception):
    def __init__(self, action, resource=None):
        self.action = action
        self.resource = resource
        message = f"Permission refusée pour l'action: {action}"
        if resource:
            message += f" sur {resource}"
        super().__init__(message)


class ValidationException(Exception):
    def __init__(self, field, message):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")