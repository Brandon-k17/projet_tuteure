"""
Permissions personnalisées pour le système DrivePARC
"""

from rest_framework import permissions


class IsAdministrator(permissions.BasePermission):
    """
    Permission pour les administrateurs système uniquement
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMIN'
        )


class IsFleetManager(permissions.BasePermission):
    """
    Permission pour les gestionnaires de parc
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'GESTIONNAIRE']
        )


class IsStaff(permissions.BasePermission):
    """
    Permission pour le personnel (Directeurs et Chefs de département)
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'GESTIONNAIRE', 'PERSONNEL']
        )


class IsDriver(permissions.BasePermission):
    """
    Permission pour les chauffeurs
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'CHAUFFEUR'
        )


class IsTechnician(permissions.BasePermission):
    """
    Permission pour les techniciens (mécaniciens)
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'TECHNICIEN'
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission d'édition uniquement pour le propriétaire
    Lecture autorisée pour tous les utilisateurs authentifiés
    """
    def has_object_permission(self, request, view, obj):
        # Lecture autorisée pour tous
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Écriture uniquement pour le propriétaire
        return obj.created_by == request.user if hasattr(obj, 'created_by') else False


class CanManageVehicles(permissions.BasePermission):
    """
    Permission pour gérer les véhicules (Admin + Gestionnaire)
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'GESTIONNAIRE']
        )


class CanManageReservations(permissions.BasePermission):
    """
    Permission pour gérer les réservations
    """
    def has_permission(self, request, view):
        # Tous les utilisateurs authentifiés peuvent voir les réservations
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user.is_authenticated
        
        # Seuls Admin et Gestionnaire peuvent créer/modifier/supprimer
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'GESTIONNAIRE']
        )


class CanValidateReservations(permissions.BasePermission):
    """
    Permission pour valider les réservations
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'GESTIONNAIRE']
        )


class CanManageMaintenance(permissions.BasePermission):
    """
    Permission pour gérer la maintenance
    """
    def has_permission(self, request, view):
        # Lecture pour tous les utilisateurs authentifiés
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Modification pour Admin, Gestionnaire et Technicien
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'GESTIONNAIRE', 'TECHNICIEN']
        )


class CanManageFuel(permissions.BasePermission):
    """
    Permission pour gérer le carburant
    """
    def has_permission(self, request, view):
        # Lecture pour tous
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Gestion pour Admin et Gestionnaire
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'GESTIONNAIRE']
        )


class CanViewReports(permissions.BasePermission):
    """
    Permission pour consulter les rapports
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'GESTIONNAIRE', 'PERSONNEL']
        )


class CanManageUsers(permissions.BasePermission):
    """
    Permission pour gérer les utilisateurs
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMIN'
        )
