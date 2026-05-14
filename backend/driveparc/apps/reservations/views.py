# ── apps/reservations/views.py ────────────────────────────────────────────────
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import date, timedelta
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings

from .models import Reservation, PointageChauffeur
from .serializers import ReservationSerializer, PointageSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class   = ReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = Reservation.objects.select_related('vehicle', 'requester', 'driver', 'approved_by')

        if user.role in ('ADMIN', 'GESTIONNAIRE'):
            qs = qs.all()
        else:
            qs = qs.filter(Q(requester=user) | Q(driver=user))

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        if self.request.query_params.get('requester') == 'me':
            qs = qs.filter(requester=user)

        if self.request.query_params.get('driver') == 'me':
            qs = qs.filter(driver=user)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            'success': True,
            'message': 'Demande envoyée avec succès. En attente de validation.',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

    # ─────────────────────────────────────────────────────────────────────────
    # APPROBATION — véhicule ET chauffeur obligatoires
    # Le véhicule RESTE "DISPONIBLE" (il ne passe "EN_SERVICE" qu'au démarrage)
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'success': False, 'message': 'Non autorisé.'}, status=403)

        reservation = self.get_object()

        if reservation.status != 'EN_ATTENTE':
            return Response({'success': False, 'message': 'Cette réservation ne peut plus être approuvée.'}, status=400)

        vehicle_id = request.data.get('vehicle')
        driver_id  = request.data.get('driver')

        # ── Véhicule ET chauffeur obligatoires ──────────────────────────────
        if not vehicle_id:
            return Response({
                'success': False,
                'message': 'Vous devez sélectionner un véhicule pour approuver cette réservation.'
            }, status=400)

        if not driver_id:
            return Response({
                'success': False,
                'message': 'Vous devez assigner un chauffeur pour approuver cette réservation.'
            }, status=400)

        from apps.vehicles.models import Vehicle
        from apps.users.models import User

        # ── Vérifier que le véhicule existe et est disponible ───────────────
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response({'success': False, 'message': 'Véhicule introuvable.'}, status=404)

        if vehicle.status not in ('DISPONIBLE',):
            return Response({
                'success': False,
                'message': f'Le véhicule {vehicle.registration_number} n\'est pas disponible (statut actuel : {vehicle.get_status_display()}).'
            }, status=400)

        # ── Conflit véhicule sur la même plage horaire ──────────────────────
        vehicle_conflict = Reservation.objects.filter(
            vehicle=vehicle,
            status__in=['APPROUVEE', 'EN_COURS'],
        ).exclude(id=reservation.id).filter(
            start_date__lt=reservation.end_date,
            end_date__gt=reservation.start_date,
        ).first()

        if vehicle_conflict:
            return Response({
                'success': False,
                'message': (
                    f'⚠️ Le véhicule {vehicle.registration_number} est déjà réservé '
                    f'du {vehicle_conflict.start_date.strftime("%d/%m/%Y à %H:%M")} '
                    f'au {vehicle_conflict.end_date.strftime("%d/%m/%Y à %H:%M")} '
                    f'(réservation #{vehicle_conflict.id} — {vehicle_conflict.requester.get_full_name()}).'
                )
            }, status=400)

        # ── Vérifier que le chauffeur existe ────────────────────────────────
        try:
            driver = User.objects.get(id=driver_id, role='CHAUFFEUR')
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'Chauffeur introuvable.'}, status=404)

        # ── Conflit chauffeur sur la même plage horaire ─────────────────────
        driver_conflict = Reservation.objects.filter(
            driver=driver,
            status__in=['APPROUVEE', 'EN_COURS'],
        ).exclude(id=reservation.id).filter(
            start_date__lt=reservation.end_date,
            end_date__gt=reservation.start_date,
        ).first()

        if driver_conflict:
            return Response({
                'success': False,
                'message': (
                    f'⚠️ Le chauffeur {driver.get_full_name()} est déjà assigné '
                    f'du {driver_conflict.start_date.strftime("%d/%m/%Y à %H:%M")} '
                    f'au {driver_conflict.end_date.strftime("%d/%m/%Y à %H:%M")} '
                    f'(réservation #{driver_conflict.id}).'
                )
            }, status=400)

        # ── Tout est OK : approuver ──────────────────────────────────────────
        # ⚠️ IMPORTANT : le véhicule reste DISPONIBLE jusqu'au démarrage réel
        reservation.vehicle    = vehicle
        reservation.driver     = driver
        reservation.status     = 'APPROUVEE'
        reservation.approved_by  = request.user
        reservation.approval_date = timezone.now()
        reservation.save()

        # NE PAS changer vehicle.status ici — il reste DISPONIBLE

        return Response({
            'success': True,
            'message': 'Réservation approuvée. Le véhicule passera "En service" au démarrage du trajet.',
            'data': ReservationSerializer(reservation).data
        })

    # ─────────────────────────────────────────────────────────────────────────
    # DÉMARRAGE DU TRAJET (par le chauffeur)
    # → véhicule passe EN_SERVICE
    # → réservation passe EN_COURS
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='start')
    def start_trip(self, request, pk=None):
        reservation = self.get_object()

        # Seul le chauffeur assigné peut démarrer
        if reservation.driver != request.user:
            return Response({
                'success': False,
                'message': 'Vous n\'êtes pas le chauffeur assigné à cette mission.'
            }, status=403)

        if reservation.status != 'APPROUVEE':
            return Response({
                'success': False,
                'message': f'Impossible de démarrer : statut actuel "{reservation.get_status_display()}".'
            }, status=400)

        # Passer le véhicule EN_SERVICE
        if reservation.vehicle:
            reservation.vehicle.status = 'EN_SERVICE'
            reservation.vehicle.save(update_fields=['status'])

        # Passer la réservation EN_COURS
        reservation.status           = 'EN_COURS'
        reservation.actual_start_date = timezone.now()
        reservation.save(update_fields=['status', 'actual_start_date'])

        return Response({
            'success': True,
            'message': 'Trajet démarré. Bon voyage !',
            'data': ReservationSerializer(reservation).data
        })

    # ─────────────────────────────────────────────────────────────────────────
    # FIN DU TRAJET (par le chauffeur)
    # → véhicule repasse DISPONIBLE
    # → réservation passe TERMINEE
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        reservation = self.get_object()

        if reservation.driver != request.user:
            return Response({
                'success': False,
                'message': 'Vous n\'êtes pas le chauffeur de cette mission.'
            }, status=403)

        if reservation.status != 'EN_COURS':
            return Response({
                'success': False,
                'message': f'Impossible de terminer : statut actuel "{reservation.get_status_display()}".'
            }, status=400)

        # Repasser le véhicule DISPONIBLE
        if reservation.vehicle:
            reservation.vehicle.status = 'DISPONIBLE'
            reservation.vehicle.save(update_fields=['status'])

        # Terminer la réservation
        reservation.status         = 'TERMINEE'
        reservation.actual_end_date = timezone.now()
        reservation.save(update_fields=['status', 'actual_end_date'])

        return Response({
            'success': True,
            'message': 'Trajet terminé. Merci !',
            'data': ReservationSerializer(reservation).data
        })

    # ─────────────────────────────────────────────────────────────────────────
    # REFUS
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'success': False, 'message': 'Non autorisé.'}, status=403)
        reservation = self.get_object()
        reservation.reject(
            rejected_by=request.user,
            reason=request.data.get('reason', 'Aucune raison fournie.')
        )
        return Response({'success': True, 'data': ReservationSerializer(reservation).data})

    # ─────────────────────────────────────────────────────────────────────────
    # ANNULATION
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        if reservation.requester != request.user and request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'success': False, 'message': 'Non autorisé.'}, status=403)
        if reservation.status not in ('EN_ATTENTE', 'APPROUVEE'):
            return Response({'success': False, 'message': 'Impossible d\'annuler.'}, status=400)

        # Si annulation d'une réservation approuvée, le véhicule reste DISPONIBLE (il l'était déjà)
        reservation.cancel(reason=request.data.get('reason', 'Annulée par le demandeur.'))
        return Response({'success': True, 'data': ReservationSerializer(reservation).data})

    # ─────────────────────────────────────────────────────────────────────────
    # NOTIFICATION EMAIL
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='notify')
    def notify(self, request, pk=None):
        reservation = self.get_object()
        notif_type  = request.data.get('type')

        requester = reservation.requester
        email     = getattr(requester, 'email', None)

        if not email:
            return Response({'success': False, 'message': 'Pas d\'email pour ce demandeur.'}, status=400)

        if notif_type == 'APPROUVEE':
            subject = "✅ Votre demande de réservation a été approuvée"
            message = f"""Bonjour {requester.get_full_name() or requester.username},

Votre demande de réservation a été approuvée.

📍 Destination : {reservation.destination}
📅 Départ      : {reservation.start_date.strftime('%d/%m/%Y à %H:%M')}
🏁 Retour      : {reservation.end_date.strftime('%d/%m/%Y à %H:%M')}
🚗 Véhicule    : {reservation.vehicle or 'À confirmer'}
👤 Chauffeur   : {reservation.driver or 'À confirmer'}

Le chauffeur viendra vous chercher à l'heure convenue.

Cordialement,
Service des Transports — IUC Logbessou
"""

        elif notif_type == 'REJETEE':
            subject = "❌ Votre demande de réservation a été refusée"
            message = f"""Bonjour {requester.get_full_name() or requester.username},

Votre demande de réservation a été refusée.

📍 Destination  : {reservation.destination}
📅 Départ prévu : {reservation.start_date.strftime('%d/%m/%Y à %H:%M')}
✕  Motif        : {reservation.rejection_reason or 'Non précisé'}

Veuillez soumettre une nouvelle demande si nécessaire.

Cordialement,
Service des Transports — IUC Logbessou
"""
        else:
            return Response({'success': False, 'message': 'Type de notification inconnu.'}, status=400)

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({'success': True, 'message': 'Email envoyé.'})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    # ─────────────────────────────────────────────────────────────────────────
    # VÉRIFICATION DISPONIBILITÉ (appelé par le frontend avant d'afficher)
    # GET /reservations/check-availability/?vehicle=X&driver=Y&start=...&end=...
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='check-availability')
    def check_availability(self, request):
        vehicle_id   = request.query_params.get('vehicle')
        driver_id    = request.query_params.get('driver')
        start_str    = request.query_params.get('start')
        end_str      = request.query_params.get('end')
        exclude_id   = request.query_params.get('exclude')  # ID de la réservation courante

        if not start_str or not end_str:
            return Response({'success': False, 'message': 'Paramètres start/end requis.'}, status=400)

        from datetime import datetime
        try:
            start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            end   = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
        except ValueError:
            return Response({'success': False, 'message': 'Format de date invalide.'}, status=400)

        result = {'vehicle_conflict': None, 'driver_conflict': None}

        # Conflit véhicule
        if vehicle_id:
            qs = Reservation.objects.filter(
                vehicle_id=vehicle_id,
                status__in=['APPROUVEE', 'EN_COURS'],
                start_date__lt=end,
                end_date__gt=start,
            )
            if exclude_id:
                qs = qs.exclude(id=exclude_id)
            conflict = qs.select_related('requester').first()
            if conflict:
                result['vehicle_conflict'] = {
                    'reservation_id': conflict.id,
                    'requester':      conflict.requester.get_full_name(),
                    'start':          conflict.start_date.strftime('%d/%m/%Y à %H:%M'),
                    'end':            conflict.end_date.strftime('%d/%m/%Y à %H:%M'),
                }

        # Conflit chauffeur
        if driver_id:
            qs = Reservation.objects.filter(
                driver_id=driver_id,
                status__in=['APPROUVEE', 'EN_COURS'],
                start_date__lt=end,
                end_date__gt=start,
            )
            if exclude_id:
                qs = qs.exclude(id=exclude_id)
            conflict = qs.select_related('requester').first()
            if conflict:
                result['driver_conflict'] = {
                    'reservation_id': conflict.id,
                    'requester':      conflict.requester.get_full_name(),
                    'start':          conflict.start_date.strftime('%d/%m/%Y à %H:%M'),
                    'end':            conflict.end_date.strftime('%d/%m/%Y à %H:%M'),
                }

        return Response({'success': True, 'data': result})


# ─────────────────────────────────────────────────────────────────────────────
class PointageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = PointageSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'CHAUFFEUR':
            return PointageChauffeur.objects.filter(chauffeur=user).select_related('vehicle')
        return PointageChauffeur.objects.all().select_related('chauffeur', 'vehicle')

    def perform_create(self, serializer):
        user    = self.request.user
        vehicle = None
        try:
            dp = getattr(user, 'driver_profile', None)
            if dp:
                vehicle = getattr(dp, 'assigned_vehicle', None)
        except Exception:
            pass
        serializer.save(chauffeur=user, date=date.today(), vehicle=vehicle)

    def create(self, request, *args, **kwargs):
        today    = date.today()
        existing = PointageChauffeur.objects.filter(chauffeur=request.user, date=today).first()
        if existing:
            now = timezone.localtime(timezone.now())
            if now.hour < 12:
                serializer = self.get_serializer(existing, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(
                {'detail': 'Pointage déjà effectué. Modification impossible après 12h.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='today')
    def today(self, request):
        pointage = PointageChauffeur.objects.filter(
            chauffeur=request.user, date=date.today()
        ).select_related('vehicle').first()
        if not pointage:
            return Response(None, status=status.HTTP_200_OK)
        return Response(PointageSerializer(pointage).data)

    @action(detail=False, methods=['get'], url_path='semaine')
    def semaine(self, request):
        since = date.today() - timedelta(days=7)
        qs    = PointageChauffeur.objects.filter(
            chauffeur=request.user, date__gte=since
        ).select_related('vehicle').order_by('-date')
        return Response(PointageSerializer(qs, many=True).data)