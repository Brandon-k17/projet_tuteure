from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
 
from .models import Reservation
from .serializers import ReservationSerializer
from core.permissions import IsAdministrator, CanManageUsers  # adapte selon tes imports
 
 
class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class   = ReservationSerializer
    permission_classes = [IsAuthenticated]
 
    def get_queryset(self):
        user = self.request.user
        qs   = Reservation.objects.select_related(
            'vehicle', 'requester', 'driver', 'approved_by'
        )
 
        # Le gestionnaire et l'admin voient TOUT
        if user.role in ('ADMIN', 'GESTIONNAIRE'):
            qs = qs.all()
        else:
            # Les autres ne voient que leurs propres réservations
            qs = qs.filter(requester=user)
 
        # Filtres query params
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
 
        requester_filter = self.request.query_params.get('requester')
        if requester_filter == 'me':
            qs = qs.filter(requester=user)
 
        return qs.order_by('-created_at')
 
    # ── CRÉATION : inject requester automatiquement ───────────────────────────
    def perform_create(self, serializer):
        """
        Le requester est TOUJOURS l'utilisateur connecté.
        Le frontend n'a pas à l'envoyer.
        """
        serializer.save(requester=self.request.user)
 
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            'success': True,
            'message': 'Demande envoyée avec succès. En attente de validation par le gestionnaire.',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
 
    # ── APPROBATION par le gestionnaire ───────────────────────────────────────
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        reservation = self.get_object()
        vehicle_id = request.data.get('vehicle')
        driver_id  = request.data.get('driver')

        if vehicle_id:
            from apps.vehicles.models import Vehicle
            vehicle = Vehicle.objects.get(id=vehicle_id)
            reservation.vehicle = vehicle
            # ← Passe EN_SERVICE pour la durée de la réservation
            vehicle.status = 'EN_SERVICE'
            vehicle.save()

        if driver_id:
            from apps.users.models import User
            reservation.driver = User.objects.get(id=driver_id)

        reservation.approve(approved_by=request.user)
        return Response(ReservationSerializer(reservation).data)
 
    # ── REJET ─────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """
        POST /api/v1/reservations/{id}/reject/
        Body: { "reason": "..." }
        """
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'success': False, 'message': 'Non autorisé.'}, status=403)
 
        reservation = self.get_object()
        reason = request.data.get('reason', 'Aucune raison fournie.')
        reservation.reject(rejected_by=request.user, reason=reason)
 
        return Response({
            'success': True,
            'message': 'Réservation rejetée.',
            'data': ReservationSerializer(reservation).data
        })
 
    # ── ANNULATION par le demandeur ───────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """
        POST /api/v1/reservations/{id}/cancel/
        Body: { "reason": "..." }
        """
        reservation = self.get_object()
 
        # Seul le demandeur ou un admin peut annuler
        if reservation.requester != request.user and request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'success': False, 'message': 'Non autorisé.'}, status=403)
 
        if reservation.status not in ('EN_ATTENTE', 'APPROUVEE'):
            return Response({
                'success': False,
                'message': 'Impossible d\'annuler une réservation déjà en cours ou terminée.'
            }, status=400)
 
        reason = request.data.get('reason', 'Annulée par le demandeur.')
        reservation.cancel(reason=reason)
 
        return Response({
            'success': True,
            'message': 'Réservation annulée.',
            'data': ReservationSerializer(reservation).data
        })
 