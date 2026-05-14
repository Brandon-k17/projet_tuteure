"""
Views pour la gestion des véhicules — DrivePARC
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
# En haut du fichier, remplace la ligne models par :
from .models import Vehicle, VehicleAssignment, VehicleInsurance, VehicleDocument, BusRoute, BusRouteLog
from .serializers import (
    VehicleSerializer, VehicleListSerializer, VehicleCreateSerializer,
    VehicleAssignmentSerializer, VehicleInsuranceSerializer, VehicleDocumentSerializer, BusRouteSerializer,       # ← manquait
    BusRouteLogSerializer, VehicleDriverSerializer, 
)


class VehicleViewSet(viewsets.ModelViewSet):
    """
    ViewSet complet pour la gestion des véhicules.
    Supporte : liste, détail, création, modification, suppression.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields  = ['status', 'vehicle_type', 'fuel_type', 'transmission']
    search_fields     = ['registration_number', 'internal_code', 'make', 'model', 'color']
    ordering_fields   = ['registration_number', 'make', 'year', 'current_mileage', 'created_at']
    ordering          = ['registration_number']

    def get_queryset(self):
        queryset = Vehicle.objects.all()
        
        status = self.request.query_params.get('status')
        assignment_type = self.request.query_params.get('assignment_type')
        category = self.request.query_params.get('category')
        
        if status:
            queryset = queryset.filter(status=status)
        if assignment_type:
            queryset = queryset.filter(assignment_type=assignment_type)
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset
 
    

    def perform_update(self, serializer):
        old = self.get_object()
        director_user_id = self.request.data.get('director_user_id')
        bus_driver_id    = self.request.data.get('bus_driver')

        instance = serializer.save()

        from apps.users.models import User

        # ── Véhicule de FONCTION ───────────────────────────────────────────────
        if instance.assignment_type == 'FONCTION':
            if director_user_id:
                try:
                    # Libérer l'ancien directeur lié à ce véhicule
                    User.objects.filter(assigned_vehicle=instance).update(assigned_vehicle=None)
                    user = User.objects.get(id=director_user_id)
                    user.assigned_vehicle = instance
                    user.save()
                    instance.assigned_director = user.get_full_name()
                    instance.save()
                except User.DoesNotExist:
                    pass

        # ── Retour au POOL → libérer le directeur ─────────────────────────────
        elif instance.assignment_type == 'POOL':
            User.objects.filter(assigned_vehicle=instance).update(assigned_vehicle=None)
            if instance.assigned_director:
                instance.assigned_director = ""
                instance.save()

        # ── BUS SCOLAIRE → assigner le chauffeur ──────────────────────────────
        elif instance.assignment_type == 'BUS_SCOLAIRE':
            if bus_driver_id:
                try:
                    driver = User.objects.get(id=bus_driver_id)
                    instance.bus_driver = driver
                    instance.save()
                except User.DoesNotExist:
                    pass

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        if self.action == 'create':
            return VehicleCreateSerializer
        return VehicleSerializer

    # ── Actions métier ─────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='available')
    def available(self, request):
        """GET /api/v1/vehicles/available/ — véhicules disponibles uniquement"""
        qs = self.get_queryset().filter(status='DISPONIBLE')
        serializer = VehicleListSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """GET /api/v1/vehicles/stats/ — statistiques globales du parc"""
        qs = self.get_queryset()
        total        = qs.count()
        disponibles  = qs.filter(status='DISPONIBLE').count()
        en_service   = qs.filter(status='EN_SERVICE').count()
        maintenance  = qs.filter(status='EN_MAINTENANCE').count()
        hors_service = qs.filter(status='HORS_SERVICE').count()
        return Response({
            'total':        total,
            'disponibles':  disponibles,
            'en_service':   en_service,
            'maintenance':  maintenance,
            'hors_service': hors_service,
        })

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """PATCH /api/v1/vehicles/{id}/status/ — changer le statut"""
        vehicle = self.get_object()
        new_status = request.data.get('status')
        valid = [s[0] for s in Vehicle._meta.get_field('status').choices]
        if new_status not in valid:
            return Response(
                {'error': f'Statut invalide. Valeurs acceptées : {valid}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        vehicle.status = new_status
        vehicle.save()
        return Response(VehicleSerializer(vehicle, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='mileage')
    def update_mileage(self, request, pk=None):
        """PATCH /api/v1/vehicles/{id}/mileage/ — mettre à jour le kilométrage"""
        vehicle = self.get_object()
        new_mileage = request.data.get('current_mileage')
        try:
            new_mileage = float(new_mileage)
        except (TypeError, ValueError):
            return Response({'error': 'Kilométrage invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_mileage < float(vehicle.current_mileage):
            return Response(
                {'error': 'Le nouveau kilométrage ne peut pas être inférieur au kilométrage actuel.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        vehicle.update_mileage(new_mileage)
        return Response(VehicleSerializer(vehicle, context={'request': request}).data)
    
    @action(detail=False, methods=['get'], url_path='my-vehicle')
    def my_vehicle(self, request):
        """GET /api/v1/vehicles/my-vehicle/ — véhicule assigné à l'utilisateur connecté"""
        user = request.user

        # Chauffeur bus scolaire → vehicle.bus_driver = user
        vehicle = Vehicle.objects.filter(bus_driver=user).first()

        # Directeur → vehicle.assigned_director lié via assigned_vehicle
        if not vehicle and hasattr(user, 'assigned_vehicle') and user.assigned_vehicle:
            vehicle = user.assigned_vehicle

        if not vehicle:
            return Response(
                {"detail": "Aucun véhicule assigné."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = VehicleSerializer(vehicle, context={'request': request})
        return Response(serializer.data)


class VehicleAssignmentViewSet(viewsets.ModelViewSet):
    queryset = VehicleAssignment.objects.all().select_related('vehicle', 'user')
    serializer_class = VehicleAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['vehicle', 'user', 'is_permanent']
    search_fields = ['vehicle__registration_number', 'user__first_name', 'user__last_name']


class VehicleInsuranceViewSet(viewsets.ModelViewSet):
    queryset = VehicleInsurance.objects.all().select_related('vehicle')
    serializer_class = VehicleInsuranceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['vehicle']


class VehicleDocumentViewSet(viewsets.ModelViewSet):
    queryset = VehicleDocument.objects.all().select_related('vehicle')
    serializer_class = VehicleDocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['vehicle', 'document_type']

# apps/vehicles/views.py (ajout)

class BusRouteViewSet(viewsets.ModelViewSet):
    serializer_class   = BusRouteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from .models import BusRoute
        user = self.request.user
        # Si chauffeur → son bus uniquement
        if hasattr(user, 'role') and user.role == 'CHAUFFEUR':
            return BusRoute.objects.filter(vehicle__bus_driver=user).select_related('vehicle')
        return BusRoute.objects.select_related('vehicle').all()