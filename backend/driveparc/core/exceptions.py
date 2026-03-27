"""
Gestion personnalisée des exceptions
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404


def custom_exception_handler(exc, context):
    """
    Gestionnaire d'exceptions personnalisé pour l'API
    Retourne des réponses d'erreur cohérentes
    """
    # Appeler le gestionnaire par défaut d'abord
    response = exception_handler(exc, context)
    
    # Gérer les exceptions Django natives
    if response is None:
        if isinstance(exc, DjangoValidationError):
            response = Response({
                'error': 'Validation Error',
                'message': str(exc),
                'details': exc.message_dict if hasattr(exc, 'message_dict') else None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        elif isinstance(exc, Http404):
            response = Response({
                'error': 'Not Found',
                'message': 'La ressource demandée n\'existe pas'
            }, status=status.HTTP_404_NOT_FOUND)
        
        else:
            # Erreur serveur générique
            response = Response({
                'error': 'Internal Server Error',
                'message': 'Une erreur interne s\'est produite'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Personnaliser la structure de réponse
    if response is not None:
        custom_response_data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': response.data.get('detail', 
                           response.data.get('message', 'Une erreur s\'est produite'))
            }
        }
        
        # Ajouter les détails si disponibles
        if 'errors' in response.data or 'details' in response.data:
            custom_response_data['error']['details'] = response.data.get('errors', 
                                                        response.data.get('details'))
        
        response.data = custom_response_data
    
    return response


class BusinessLogicException(Exception):
    """
    Exception pour les erreurs de logique métier
    """
    def __init__(self, message, code='BUSINESS_ERROR'):
        self.message = message
        self.code = code
        super().__init__(self.message)


class ResourceNotFoundException(Exception):
    """
    Exception quand une ressource n'est pas trouvée
    """
    def __init__(self, resource_name, resource_id=None):
        self.resource_name = resource_name
        self.resource_id = resource_id
        message = f"{resource_name} non trouvé"
        if resource_id:
            message += f" (ID: {resource_id})"
        super().__init__(message)


class PermissionDeniedException(Exception):
    """
    Exception pour refus de permission
    """
    def __init__(self, action, resource=None):
        self.action = action
        self.resource = resource
        message = f"Permission refusée pour l'action: {action}"
        if resource:
            message += f" sur {resource}"
        super().__init__(message)


class ValidationException(Exception):
    """
    Exception pour erreurs de validation
    """
    def __init__(self, field, message):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")
