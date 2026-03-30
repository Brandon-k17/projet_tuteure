"""
Views pour la gestion des véhicules — DrivePARC
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Vehicle, VehicleAssignment, VehicleInsurance, VehicleDocument
from .serializers import (
    VehicleSerializer, VehicleListSerializer, VehicleCreateSerializer,
    VehicleAssignmentSerializer, VehicleInsuranceSerializer, VehicleDocumentSerializer
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
    
        # Filtre statut
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
    
        # ← AJOUTER CE FILTRE
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
    
        # Filtre recherche texte
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(registration_number__icontains=search) |
                Q(make__icontains=search) |
                Q(model__icontains=search) |
                Q(internal_code__icontains=search)
            )
    
        return queryset.order_by('-created_at')
 
 

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