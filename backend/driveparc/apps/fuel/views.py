"""
apps/fuel/views.py
"""
import json
from datetime import date
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status
import calendar
from datetime import datetime
import pytz
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import FuelCard, FuelTransaction, MonthlyFuelAllocation, MONTHLY_QUOTA
from .serializers import (
    FuelCardSerializer, FuelTransactionSerializer,
    MonthlyFuelAllocationSerializer, FuelDashboardSerializer,
)
from apps.notifications.models import Notification
from apps.users.models import User


def _notify_gestionnaires(title, message, ntype='INFO'):
    try:
        from apps.notifications.models import Notification
        from apps.users.models import User
        gestionnaires = User.objects.filter(role__in=['GESTIONNAIRE', 'ADMIN'])
        for g in gestionnaires:
            Notification.objects.create(
                recipient=g,
                title=title,
                message=message,
                # type=ntype,  ← commenté jusqu'à confirmation du vrai nom
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"_notify_gestionnaires error: {e}")
# ── Cartes ──────────────────────────────────────────────────────────────────
class FuelCardViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = FuelCardSerializer

    def get_queryset(self):
        user = self.request.user
        qs   = FuelCard.objects.select_related('vehicle', 'vehicle__bus_driver').all()
        if user.role == 'CHAUFFEUR':
            from apps.vehicles.models import VehicleAssignment
            # Véhicules assignés via bus_driver
            q1 = Q(vehicle__bus_driver=user)
            # Véhicules assignés via VehicleAssignment actif
            assigned_vehicle_ids = VehicleAssignment.objects.filter(
                user=user, is_active=True
            ).values_list('vehicle_id', flat=True)
            q2 = Q(vehicle_id__in=assigned_vehicle_ids)
            qs = qs.filter(q1 | q2).distinct()
        return qs
    @action(detail=False, methods=['get'], url_path='my-card')
    def my_card(self, request):
        """GET /api/v1/fuel/cards/my-card/ — carte du chauffeur connecté."""
        user = request.user

        # Cherche la carte liée au véhicule dont ce chauffeur est le bus_driver
        card = FuelCard.objects.select_related('vehicle').filter(
            vehicle__bus_driver=user
        ).first()

        # Si pas trouvée via bus_driver, cherche via VehicleAssignment
        if not card:
            from apps.vehicles.models import VehicleAssignment
            assignment = VehicleAssignment.objects.filter(
                user=user, is_active=True
            ).select_related('vehicle__fuel_card').first()
            if assignment and hasattr(assignment.vehicle, 'fuel_card'):
                card = assignment.vehicle.fuel_card

        if not card:
            return Response({'detail': 'Aucune carte assignée.'}, status=404)

        return Response(FuelCardSerializer(card, context={'request': request}).data)
            

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """
        GET /api/v1/fuel/cards/dashboard/?month=4&year=2026
        Résumé mensuel pour le gestionnaire.
        """
        now   = timezone.now()
        month = int(request.query_params.get('month', now.month))
        year  = int(request.query_params.get('year',  now.year))

        cards = FuelCard.objects.filter(is_active=True)

        # Budget total = somme des allocations du mois (ou quotas par défaut)
        allocs = MonthlyFuelAllocation.objects.filter(month=month, year=year)
        alloc_map = {a.card_id: float(a.allocated_amount) for a in allocs}
        budget_total = sum(
            alloc_map.get(c.id, c.monthly_quota) for c in cards
        )

        # Consommation validée du mois
        start, end = month_range(year, month)

        consumed = FuelTransaction.objects.filter(
            status='VALIDE',
            transaction_date__gte=start,
            transaction_date__lte=end,
        ).aggregate(s=Sum('total_amount'))['s'] or 0

        top = (
            FuelTransaction.objects
            .filter(status='VALIDE', transaction_date__gte=start, transaction_date__lte=end)
            .values('card__vehicle__registration_number', 'card__vehicle__make', 'card__vehicle__model')
            .annotate(total=Sum('total_amount'), litres=Sum('quantity_liters'))
            .order_by('-total')[:5]
        )

        data = {
            'budget_total':   budget_total,
            'consumed_total': float(consumed),
            'balance_total':  budget_total - float(consumed),
            'usage_pct':      round(float(consumed) / budget_total * 100, 1) if budget_total else 0,
            'active_cards':   cards.count(),
            'total_cards':    FuelCard.objects.count(),
            'pending_transactions': pending,
            'top_consumers': list(top),
        }
        return Response(data)

    @action(detail=True, methods=['post'], url_path='recharge')
    def recharge(self, request, pk=None):
        """
        POST /api/v1/fuel/cards/{id}/recharge/
        Crée/met à jour l'allocation mensuelle (gestionnaire uniquement).
        Body: { month, year, allocated_amount, notes }
        """
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'detail': 'Non autorisé.'}, status=403)
        card = self.get_object()
        month  = request.data.get('month', timezone.now().month)
        year   = request.data.get('year',  timezone.now().year)
        amount = request.data.get('allocated_amount')
        if not amount:
            return Response({'detail': 'allocated_amount requis.'}, status=400)

        alloc, created = MonthlyFuelAllocation.objects.update_or_create(
            card=card, month=month, year=year,
            defaults={
                'allocated_amount': amount,
                'approved_by':      request.user,
                'notes':            request.data.get('notes', ''),
            }
        )
        return Response(MonthlyFuelAllocationSerializer(alloc).data,
                        status=201 if created else 200)
    # Ajoute cet helper en haut de views.py, après les imports


    def month_range(year, month):
        """Retourne (start, end) en datetime aware pour le mois donné."""
        tz = pytz.timezone('Africa/Douala')
        start = tz.localize(datetime(year, month, 1, 0, 0, 0))
        last_day = calendar.monthrange(year, month)[1]
        end = tz.localize(datetime(year, month, last_day, 23, 59, 59))
        return start, end

# ── Transactions ─────────────────────────────────────────────────────────────
class FuelTransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = FuelTransactionSerializer
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        qs   = FuelTransaction.objects.select_related(
            'card__vehicle', 'driver', 'reservation', 'validated_by'
        ).all()
        if user.role == 'CHAUFFEUR':
            qs = qs.filter(driver=user)
        # Filtres optionnels
        status_f = self.request.query_params.get('status')
        month    = self.request.query_params.get('month')
        year     = self.request.query_params.get('year')
        card_id  = self.request.query_params.get('card')
        if status_f: qs = qs.filter(status=status_f)
        if month:    qs = qs.filter(transaction_date__month=month)
        if year:     qs = qs.filter(transaction_date__year=year)
        if card_id:  qs = qs.filter(card_id=card_id)
        return qs

    def create(self, request, *args, **kwargs):
        user = request.user
        transaction_type = request.data.get('transaction_type', 'RAMASSAGE')
        reservation_id   = request.data.get('reservation')

        # ── Déterminer la carte ──────────────────────────────────────────────
        if transaction_type == 'MISSION' and reservation_id:
            from apps.reservations.models import Reservation
            try:
                reservation = Reservation.objects.select_related(
                    'vehicle__fuel_card'
                ).get(id=reservation_id)
                if reservation.vehicle and hasattr(reservation.vehicle, 'fuel_card'):
                    card = reservation.vehicle.fuel_card
                else:
                    return Response(
                        {'detail': "Le véhicule de cette mission n'a pas de carte carburant."},
                        status=400
                    )
            except Reservation.DoesNotExist:
                return Response({'detail': "Réservation introuvable."}, status=400)
        else:
            card = FuelCard.objects.filter(vehicle__bus_driver=user).first()
            if not card:
                from apps.vehicles.models import VehicleAssignment
                assignment = VehicleAssignment.objects.filter(
                    user=user, is_active=True
                ).select_related('vehicle__fuel_card').first()
                if assignment and hasattr(assignment.vehicle, 'fuel_card'):
                    card = assignment.vehicle.fuel_card
            if not card:
                return Response(
                    {'detail': "Aucune carte carburant assignée à votre véhicule."},
                    status=400
                )

        # ── Anti-doublon ramassage ───────────────────────────────────────────
        if transaction_type == 'RAMASSAGE':
            today = timezone.now().date()
            if FuelTransaction.objects.filter(
                driver=user,
                transaction_type='RAMASSAGE',
                transaction_date__date=today,
            ).exists():
                return Response(
                    {'detail': "Consommation de ramassage déjà enregistrée aujourd'hui."},
                    status=400
                )

        # ── Serializer + sauvegarde ──────────────────────────────────────────
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tx = serializer.save(driver=user, card=card)

        # Notification
        try:
            _notify_gestionnaires(
                title=f"Saisie carburant — {tx.card.vehicle.registration_number}",
                message=(
                    f"{tx.driver.get_full_name()} a saisi {tx.quantity_liters}L "
                    f"({tx.total_amount:,.0f} FCFA) — "
                    f"{'Ramassage' if tx.transaction_type == 'RAMASSAGE' else 'Mission'}."
                ),
                ntype='INFO',
            )
        except Exception:
            pass

        return Response(
            FuelTransactionSerializer(tx, context={'request': request}).data,
            status=201
        )

    @action(detail=True, methods=['post'], url_path='valider')
    def valider(self, request, pk=None):
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'detail': 'Non autorisé.'}, status=403)

        tx         = self.get_object()
        action_val = request.data.get('action')  # ← renommé action_val partout

        if action_val not in ('VALIDE', 'REJETE'):
            return Response({'detail': 'action must be VALIDE or REJETE.'}, status=400)

        tx.status       = action_val
        tx.validated_by = request.user
        if action_val == 'REJETE':
            tx.rejection_reason = request.data.get('reason', '')
        tx.save()

        # Notifier le chauffeur — sans le champ type
        try:
            Notification.objects.create(
                recipient=tx.driver,
                title="Saisie carburant " + ("validée ✓" if action_val == 'VALIDE' else "rejetée ✗"),
                message=(
                    f"Votre saisie du {tx.transaction_date.strftime('%d/%m/%Y')} "
                    f"({tx.quantity_liters}L — {tx.total_amount:,.0f} FCFA) a été "
                    + ("validée." if action_val == 'VALIDE'
                    else f"rejetée. Motif : {tx.rejection_reason}")
                ),
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Notification valider failed: {e}")

        return Response(FuelTransactionSerializer(tx, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        GET /api/v1/fuel/transactions/stats/?month=4&year=2026
        Statistiques détaillées pour le gestionnaire.
        """
        now   = timezone.now()
        month = int(request.query_params.get('month', now.month))
        year  = int(request.query_params.get('year',  now.year))

        qs = FuelTransaction.objects.filter(
            status='VALIDE',
            transaction_date__month=month,
            transaction_date__year=year,
        )
        by_type = qs.values('transaction_type').annotate(
            total=Sum('total_amount'), litres=Sum('quantity_liters'), count=Count('id')
        )
        daily = (
            qs.extra(select={'day': "DATE(transaction_date)"})
            .values('day')
            .annotate(total=Sum('total_amount'), litres=Sum('quantity_liters'))
            .order_by('day')
        )
        return Response({
            'by_type': list(by_type),
            'daily':   list(daily),
        })


# ── Allocations ──────────────────────────────────────────────────────────────
class MonthlyFuelAllocationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = MonthlyFuelAllocationSerializer

    def get_queryset(self):
        qs = MonthlyFuelAllocation.objects.select_related(
            'card__vehicle', 'approved_by'
        ).all()
        month = self.request.query_params.get('month')
        year  = self.request.query_params.get('year')
        if month: qs = qs.filter(month=month)
        if year:  qs = qs.filter(year=year)
        return qs

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        POST /api/v1/fuel/allocations/bulk-create/
        Crée les allocations mensuelles pour tous les véhicules actifs.
        Body: { month, year, use_defaults: true }
        Gestionnaire uniquement.
        """
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'detail': 'Non autorisé.'}, status=403)

        month = request.data.get('month', timezone.now().month)
        year  = request.data.get('year',  timezone.now().year)
        cards = FuelCard.objects.filter(is_active=True).select_related('vehicle')

        created_count = 0
        for card in cards:
            amount = request.data.get(f'amount_{card.id}') or card.monthly_quota
            _, created = MonthlyFuelAllocation.objects.get_or_create(
                card=card, month=month, year=year,
                defaults={
                    'allocated_amount': amount,
                    'approved_by':      request.user,
                }
            )
            if created:
                created_count += 1

        return Response({
            'created': created_count,
            'message': f'{created_count} allocations créées pour {month}/{year}.'
        })