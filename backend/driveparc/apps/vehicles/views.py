"""
Vues pour la gestion des véhicules
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from .models import Vehicle, VehicleAssignment, VehicleInsurance, VehicleDocument
from .serializers import (
    VehicleSerializer, VehicleListSerializer, VehicleCreateSerializer,
    VehicleAssignmentSerializer, VehicleInsuranceSerializer, VehicleDocumentSerializer
)
from core.permissions import CanManageVehicles


class VehicleViewSet(viewsets.ModelViewSet):
    """CRUD complet pour les véhicules"""
    queryset = Vehicle.objects.all()
    permission_classes = [IsAuthenticated, CanManageVehicles]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'vehicle_type', 'fuel_type', 'is_active']
    search_fields = ['registration_number', 'internal_code', 'make', 'model']
    ordering_fields = ['registration_number', 'make', 'year', 'current_mileage', 'created_at']
    ordering = ['registration_number']

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        if self.action == 'create':
            return VehicleCreateSerializer
        return VehicleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()
        return Response({
            'success': True,
            'message': 'Véhicule créé avec succès',
            'data': VehicleSerializer(vehicle).data
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'success': True,
            'message': 'Véhicule mis à jour avec succès',
            'data': VehicleSerializer(instance).data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response({'success': True, 'message': 'Véhicule désactivé avec succès'})

    @action(detail=False, methods=['get'])
    def available(self, request):
        """GET /api/vehicles/available/ — véhicules disponibles"""
        vehicles = Vehicle.objects.filter(status='DISPONIBLE', is_active=True)
        serializer = VehicleListSerializer(vehicles, many=True)
        return Response({'success': True, 'count': vehicles.count(), 'data': serializer.data})

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """POST /api/vehicles/{id}/change_status/ — changer le statut"""
        vehicle = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = ['DISPONIBLE', 'EN_SERVICE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'RESERVE']
        if new_status not in valid_statuses:
            return Response(
                {'success': False, 'message': f'Statut invalide. Valeurs: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        vehicle.status = new_status
        vehicle.save(update_fields=['status', 'updated_at'])
        return Response({
            'success': True,
            'message': f'Statut changé en {new_status}',
            'data': VehicleSerializer(vehicle).data
        })

    @action(detail=True, methods=['post'])
    def update_mileage(self, request, pk=None):
        """POST /api/vehicles/{id}/update_mileage/ — mettre à jour le kilométrage"""
        vehicle = self.get_object()
        new_mileage = request.data.get('mileage')
        if new_mileage is None:
            return Response({'success': False, 'message': 'Champ mileage requis'}, status=400)
        try:
            new_mileage = float(new_mileage)
        except (ValueError, TypeError):
            return Response({'success': False, 'message': 'Kilométrage invalide'}, status=400)
        if new_mileage <= float(vehicle.current_mileage):
            return Response(
                {'success': False, 'message': 'Le nouveau kilométrage doit être supérieur à l\'actuel'},
                status=status.HTTP_400_BAD_REQUEST
            )
        vehicle.current_mileage = new_mileage
        vehicle.save(update_fields=['current_mileage', 'updated_at'])
        return Response({
            'success': True,
            'message': 'Kilométrage mis à jour',
            'data': {'current_mileage': vehicle.current_mileage}
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """GET /api/vehicles/stats/ — statistiques du parc"""
        from django.db.models import Count
        total = Vehicle.objects.filter(is_active=True).count()
        by_status = list(
            Vehicle.objects.filter(is_active=True)
            .values('status').annotate(count=Count('id'))
        )
        by_type = list(
            Vehicle.objects.filter(is_active=True)
            .values('vehicle_type').annotate(count=Count('id'))
        )
        return Response({
            'success': True,
            'data': {'total': total, 'by_status': by_status, 'by_type': by_type}
        })
