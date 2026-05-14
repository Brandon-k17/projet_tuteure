# apps/maintenance/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
# APRÈS — seulement les modèles qui existent réellement
from .models import Maintenance, Breakdown
from .serializers import (
    MaintenanceSerializer,
    BreakdownSerializer,
   
)




class MaintenanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MaintenanceSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Maintenance.objects.select_related('vehicle', 'technician').all()
        if user.role == 'TECHNICIEN':
            qs = qs.filter(technician=user)
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        return qs.order_by('-scheduled_date')

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        m = self.get_object()
        m.start_maintenance()
        return Response(MaintenanceSerializer(m).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        maintenance = self.get_object()
 
        if maintenance.status == 'TERMINE':
            return Response(
                {'success': False, 'message': 'Cette maintenance est déjà clôturée.'},
                status=400
            )
 
        # Récupérer les champs du formulaire de clôture
        work_performed = request.data.get('work_performed', '')
        parts_replaced = request.data.get('parts_replaced', '')
        labor_cost     = request.data.get('labor_cost', 0)
        parts_cost     = request.data.get('parts_cost', 0)
        notes          = request.data.get('notes', '')
        done_date      = request.data.get('done_date')    # alias frontend
        done_km        = request.data.get('done_km')      # alias frontend
 
        # Mettre à jour les champs
        if work_performed:
            maintenance.work_performed = work_performed
        if parts_replaced:
            maintenance.parts_replaced = parts_replaced
        if notes:
            maintenance.notes = notes
        try:
            if labor_cost:
                maintenance.labor_cost = float(labor_cost)
            if parts_cost:
                maintenance.parts_cost = float(parts_cost)
        except (ValueError, TypeError):
            pass
 
        # Mapper done_date → end_date
        if done_date:
            from django.utils.dateparse import parse_date, parse_datetime
            from django.utils import timezone
            parsed = parse_datetime(done_date) or parse_date(done_date)
            if parsed:
                import datetime
                if isinstance(parsed, datetime.date) and not isinstance(parsed, datetime.datetime):
                    parsed = datetime.datetime.combine(parsed, datetime.time(12, 0))
                    parsed = timezone.make_aware(parsed)
                maintenance.end_date = parsed
 
        # Mapper done_km → mileage_at_maintenance
        if done_km:
            try:
                maintenance.mileage_at_maintenance = float(done_km)
                # Mettre à jour le kilométrage du véhicule
                maintenance.vehicle.current_mileage = float(done_km)
                maintenance.vehicle.save(update_fields=['current_mileage'])
            except (ValueError, TypeError):
                pass
 
        # Clôturer
        maintenance.complete_maintenance()  # passe status=TERMINE + véhicule DISPONIBLE
 
        from .serializers import MaintenanceSerializer
        return Response({
            'success': True,
            'message': 'Maintenance clôturée avec succès.',
            'data': MaintenanceSerializer(maintenance).data
        })



class BreakdownViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BreakdownSerializer
    parser_classes_extra = []

    def get_queryset(self):
        user = self.request.user
        qs = Breakdown.objects.select_related(
            'vehicle', 'reported_by', 'assigned_technician'
        ).all()
        if user.role == 'TECHNICIEN':
            qs = qs.filter(assigned_technician=user)
        elif user.role == 'CHAUFFEUR':
            qs = qs.filter(reported_by=user)
        status_f   = self.request.query_params.get('status')
        severity_f = self.request.query_params.get('severity')
        if status_f:   qs = qs.filter(status=status_f)
        if severity_f: qs = qs.filter(severity=severity_f)
        return qs.order_by('-reported_date')

    def perform_create(self, serializer):
        breakdown = serializer.save(reported_by=self.request.user)
        # Notifier tous les gestionnaires
        try:
            from apps.notifications.models import Notification
            from apps.users.models import User
            gestionnaires = User.objects.filter(role__in=['GESTIONNAIRE', 'ADMIN'])
            emoji = "🚨" if breakdown.severity == 'CRITIQUE' else "⚠️"
            for g in gestionnaires:
                Notification.objects.create(
                    recipient=g,
                    title=f"{emoji} Panne signalée — {breakdown.vehicle}",
                    message=(
                        f"{breakdown.reported_by.get_full_name()} a signalé : "
                        f"{breakdown.title}. Gravité : {breakdown.severity}. "
                        f"Lieu : {breakdown.location or 'Non précisé'}."
                    ),
                    type='ERROR' if breakdown.severity == 'CRITIQUE' else 'WARNING',
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Notification breakdown failed: {e}")

    # ── Gestionnaire assigne un technicien ────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='assigner')
    def assigner(self, request, pk=None):
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'detail': 'Non autorisé.'}, status=403)

        breakdown = self.get_object()
        technicien_id = request.data.get('technicien_id')
        notes_gestionnaire = request.data.get('notes', '')

        if not technicien_id:
            return Response({'detail': 'technicien_id requis.'}, status=400)

        try:
            from apps.users.models import User
            tech = User.objects.get(id=technicien_id, role='TECHNICIEN')
        except User.DoesNotExist:
            return Response({'detail': 'Technicien introuvable.'}, status=404)

        breakdown.assigned_technician = tech
        breakdown.status = 'EN_DIAGNOSTIC'
        if notes_gestionnaire:
            breakdown.notes = notes_gestionnaire
        breakdown.save()

        # Notifier le technicien
        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                recipient=tech,
                title=f"🔧 Nouveau ticket assigné — {breakdown.vehicle}",
                message=(
                    f"Panne : {breakdown.title}. "
                    f"Gravité : {breakdown.severity}. "
                    f"Lieu : {breakdown.location or 'Non précisé'}. "
                    f"Signalé par : {breakdown.reported_by.get_full_name()}."
                ),
                type='ERROR' if breakdown.severity == 'CRITIQUE' else 'WARNING',
            )
            # Notifier le chauffeur
            Notification.objects.create(
                recipient=breakdown.reported_by,
                title="✓ Votre signalement est pris en charge",
                message=f"Un technicien a été assigné à votre incident ({breakdown.title}).",
                type='INFO',
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Notification assigner failed: {e}")

        return Response(BreakdownSerializer(breakdown).data)

    # ── Technicien démarre / clôture l'intervention ───────────────────────────
    @action(detail=True, methods=['post'], url_path='intervenir')
    def intervenir(self, request, pk=None):
        breakdown = self.get_object()
        action_type = request.data.get('action')  # 'START' | 'CLOSE' | 'IRREPARABLE'

        if action_type == 'START':
            breakdown.status = 'EN_REPARATION'
            breakdown.diagnosis = request.data.get('diagnosis', '')
            breakdown.vehicle.mark_as_in_maintenance()
            breakdown.vehicle.save()

        elif action_type == 'CLOSE':
            breakdown.status = 'REPARE'
            breakdown.resolved_date = timezone.now()
            breakdown.repair_actions = request.data.get('repair_actions', '')
            breakdown.parts_used     = request.data.get('parts_used', '')
            breakdown.repair_cost    = request.data.get('repair_cost', 0)
            breakdown.vehicle.mark_as_available()
            breakdown.vehicle.save()
            # Notifier le chauffeur
            try:
                from apps.notifications.models import Notification
                Notification.objects.create(
                    recipient=breakdown.reported_by,
                    title="✅ Votre véhicule est réparé",
                    message=f"L'incident '{breakdown.title}' a été résolu. Votre véhicule est de nouveau disponible.",
                    type='SUCCESS',
                )
            except Exception:
                pass

        elif action_type == 'IRREPARABLE':
            breakdown.mark_as_not_repairable()

        breakdown.save()
        return Response(BreakdownSerializer(breakdown).data)

    # ── Gestionnaire rejette un signalement ───────────────────────────────────
    @action(detail=True, methods=['post'], url_path='rejeter')
    def rejeter(self, request, pk=None):
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'detail': 'Non autorisé.'}, status=403)
        breakdown = self.get_object()
        breakdown.status = 'NON_REPARABLE'
        breakdown.notes  = request.data.get('reason', 'Signalement rejeté.')
        breakdown.save()
        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                recipient=breakdown.reported_by,
                title="Signalement rejeté",
                message=f"Votre signalement '{breakdown.title}' a été rejeté. Motif : {breakdown.notes}",
                type='ERROR',
            )
        except Exception:
            pass
        return Response(BreakdownSerializer(breakdown).data)
    
    @action(detail=True, methods=['post'], url_path='transferer')
    def transferer(self, request, pk=None):
        
        if request.user.role not in ('ADMIN', 'GESTIONNAIRE'):
            return Response({'detail': 'Non autorisé.'}, status=403)
    
        breakdown = self.get_object()
    
        if breakdown.status != 'EN_REPARATION':
            return Response(
                {'detail': 'Le rapatriement doit être confirmé avant le transfert en maintenance.'},
                status=400
            )
    
        notes          = request.data.get('notes', '')
        create_maint   = request.data.get('create_maintenance', True)
    
        # 1. Mettre à jour le breakdown
        breakdown.status = 'TRANSFERE_MAINT'
        if notes:
            breakdown.notes = notes
        breakdown.save()
    
        # 2. Créer la fiche maintenance si demandé
        maint_id = None
        if create_maint and breakdown.vehicle:
            panne_to_maint = {
                'ACCIDENT_COLLISION': 'CARROSSERIE',
                'PANNE_MOTEUR':       'REVISION_MAJOR',
                'INCENDIE':           'REVISION_MAJOR',
                'PERTE_FREINS':       'FREINS',
                'CREVAISON_BLOCAGE':  'PNEUS',
                'CREVAISON_SIMPLE':   'PNEUS',
                'RETRO_CASSE':        'CARROSSERIE',
                'VITRE_CASSEE':       'CARROSSERIE',
                'ECLAIRAGE_DEFAUT':   'ELECTRICITE',
                'CARROSSERIE':        'CARROSSERIE',
                'ESSUIE_GLACE':       'AUTRE',
                'AUTRE_IMMOBILISANT': 'AUTRE',
                'AUTRE_SIMPLE':       'AUTRE',
            }
            # Déduire le type depuis le titre si category pas dispo
            maint_type = panne_to_maint.get(
                getattr(breakdown, 'category', None) or '', 'AUTRE'
            )
            priorite = 'CRITIQUE' if breakdown.severity == 'CRITIQUE' else 'HAUTE'
    
            desc = (
                f"[Signalement #{breakdown.id}] {breakdown.title}.\n"
                f"{breakdown.description or ''}\n"
            )
            if notes:
                desc += f"\nNotes de transfert : {notes}"
            if breakdown.location:
                desc += f"\nLieu de l'incident : {breakdown.location}"
    
            try:
                maint = Maintenance.objects.create(
                    vehicle          = breakdown.vehicle,
                    maintenance_type = 'CORRECTIVE',
                    type             = maint_type,       # si le champ existe (sinon retirer)
                    priorite         = priorite,          # si le champ existe (sinon retirer)
                    status           = 'EN_COURS',
                    scheduled_date   = timezone.now().date(),
                    description      = desc.strip(),
                    technician       = breakdown.assigned_technician,
                )
                # Lier le breakdown à la maintenance
                breakdown.maintenance = maint
                breakdown.save(update_fields=['maintenance'])
                maint_id = maint.id
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Maintenance creation failed: {e}")
    
        # 3. Passer le véhicule EN_MAINTENANCE
        try:
            v = breakdown.vehicle
            v.status = 'EN_MAINTENANCE'
            v.save(update_fields=['status'])
        except Exception:
            pass
    
        # 4. Notifier le chauffeur
        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                recipient = breakdown.reported_by,
                title     = "Votre véhicule est en cours de réparation",
                message   = (
                    f"L'incident '{breakdown.title}' a été transféré en maintenance. "
                    f"La réparation va commencer. Vous serez notifié à la fin."
                ),
                type = 'INFO',
            )
        except Exception:
            pass
    
        data = BreakdownSerializer(breakdown).data
        if maint_id:
            data['linked_maintenance_id'] = maint_id
    
        return Response({
            'success': True,
            'linked_maintenance_id': maint_id,
            'breakdown': data,
        })
