"""
Vues pour l'application users
"""

from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import logout
from django.db.models import Q

from .models import User, DriverProfile, TechnicianProfile
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, LoginSerializer, DriverProfileSerializer,
    TechnicianProfileSerializer
)
from core.permissions import IsAdministrator, CanManageUsers


class AuthViewSet(viewsets.GenericViewSet):
    """
    ViewSet pour l'authentification et la gestion du compte
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Connexion utilisateur
        POST /api/v1/auth/login/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'success': True,
            'message': 'Connexion réussie',
            'data': {
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Déconnexion utilisateur
        POST /api/v1/auth/logout/
        """
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            logout(request)
            return Response({
                'success': True,
                'message': 'Déconnexion réussie'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def refresh(self, request):
        """
        Rafraîchir le token d'accès
        POST /api/v1/auth/refresh/
        """
        try:
            refresh_token = request.data.get('refresh_token')
            if not refresh_token:
                return Response({
                    'success': False,
                    'message': 'Refresh token requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            refresh = RefreshToken(refresh_token)
            return Response({
                'success': True,
                'data': {
                    'access': str(refresh.access_token)
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Token invalide ou expiré'
            }, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        """
        Récupérer le profil de l'utilisateur connecté
        GET /api/v1/auth/profile/
        """
        if not request.user or not request.user.is_authenticated:
            from rest_framework.exceptions import NotAuthenticated
            raise NotAuthenticated()
        serializer = UserSerializer(request.user)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['put', 'patch'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        """
        Mettre à jour le profil de l'utilisateur connecté
        PUT/PATCH /api/v1/auth/update_profile/
        """
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=request.method == 'PATCH'
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'success': True,
            'message': 'Profil mis à jour avec succès',
            'data': UserSerializer(request.user).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """
        Changer le mot de passe
        POST /api/v1/auth/change_password/
        """
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        
        # Vérifier l'ancien mot de passe
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({
                'success': False,
                'message': 'Ancien mot de passe incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Définir le nouveau mot de passe
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({
            'success': True,
            'message': 'Mot de passe changé avec succès'
        }, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des utilisateurs
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, CanManageUsers]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_queryset(self):
        """
        Filtrer les utilisateurs selon les paramètres de requête
        """
        queryset = super().get_queryset()
        
        # Filtrer par rôle
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)
        
        # Filtrer par département
        department = self.request.query_params.get('department', None)
        if department:
            queryset = queryset.filter(department__icontains=department)
        
        # Filtrer par statut actif/inactif
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Recherche globale
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(employee_id__icontains=search)
            )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Créer un nouvel utilisateur"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Utilisateur créé avec succès',
            'data': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Mettre à jour un utilisateur"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'success': True,
            'message': 'Utilisateur mis à jour avec succès',
            'data': UserSerializer(instance).data
        }, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Désactiver un utilisateur (soft delete)"""
        instance = self.get_object()
        instance.soft_delete()
        
        return Response({
            'success': True,
            'message': 'Utilisateur désactivé avec succès'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activer un utilisateur désactivé
        POST /api/v1/users/{id}/activate/
        """
        user = self.get_object()
        user.restore()
        
        return Response({
            'success': True,
            'message': 'Utilisateur activé avec succès',
            'data': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """
        Réinitialiser le mot de passe d'un utilisateur
        POST /api/v1/users/{id}/reset_password/
        """
        user = self.get_object()
        
        # Générer un mot de passe temporaire
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
        
        user.set_password(temp_password)
        user.save()
        
        # TODO: Envoyer le mot de passe par email
        
        return Response({
            'success': True,
            'message': 'Mot de passe réinitialisé avec succès',
            'data': {
                'temp_password': temp_password  # À retirer en production
            }
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def roles(self, request):
        """
        Obtenir la liste des rôles disponibles
        GET /api/v1/users/roles/
        """
        from core.constants import USER_ROLES
        
        return Response({
            'success': True,
            'data': [
                {'value': role[0], 'label': role[1]}
                for role in USER_ROLES
            ]
        }, status=status.HTTP_200_OK)


class DriverProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des profils chauffeurs
    """
    queryset = DriverProfile.objects.select_related('user').all()
    serializer_class = DriverProfileSerializer
    permission_classes = [IsAuthenticated, IsAdministrator]
    
    def get_queryset(self):
        """Filtrer les profils chauffeurs"""
        queryset = super().get_queryset()
        
        # Filtrer par disponibilité
        is_available = self.request.query_params.get('is_available', None)
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')
        
        # Filtrer les permis expirés ou expirant bientôt
        license_status = self.request.query_params.get('license_status', None)
        if license_status == 'expired':
            from django.utils import timezone
            queryset = queryset.filter(license_expiry_date__lt=timezone.now().date())
        elif license_status == 'expiring_soon':
            from django.utils import timezone
            from datetime import timedelta
            warning_date = timezone.now().date() + timedelta(days=30)
            queryset = queryset.filter(
                license_expiry_date__lte=warning_date,
                license_expiry_date__gte=timezone.now().date()
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        Obtenir la liste des chauffeurs disponibles
        GET /api/v1/drivers/available/
        """
        available_drivers = self.get_queryset().filter(
            is_available=True,
            is_active=True,
            user__is_active=True
        )
        
        serializer = self.get_serializer(available_drivers, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class TechnicianProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des profils techniciens
    """
    queryset = TechnicianProfile.objects.select_related('user').all()
    serializer_class = TechnicianProfileSerializer
    permission_classes = [IsAuthenticated, IsAdministrator]
    
    def get_queryset(self):
        """Filtrer les profils techniciens"""
        queryset = super().get_queryset()
        
        # Filtrer par disponibilité
        is_available = self.request.query_params.get('is_available', None)
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')
        
        # Filtrer par spécialisation
        specialization = self.request.query_params.get('specialization', None)
        if specialization:
            queryset = queryset.filter(specialization__icontains=specialization)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        Obtenir la liste des techniciens disponibles
        GET /api/v1/technicians/available/
        """
        available_technicians = self.get_queryset().filter(
            is_available=True,
            is_active=True,
            user__is_active=True
        )
        
        serializer = self.get_serializer(available_technicians, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
