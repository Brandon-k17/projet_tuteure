from rest_framework import serializers
from .models import Maintenance, Breakdown
 
 
class MaintenanceSerializer(serializers.ModelSerializer):
    # ── Champs calculés / lisibles ────────────────────────────────────────────
    vehicle_name         = serializers.SerializerMethodField()
    vehicle_registration = serializers.SerializerMethodField()   # ← AJOUT
    vehicle_km           = serializers.SerializerMethodField()   # ← AJOUT km actuel du véhicule
    technician_name      = serializers.SerializerMethodField()   # ← CORRIGÉ (était source= qui plante si null)
    is_overdue           = serializers.BooleanField(read_only=True)
    duration_hours       = serializers.FloatField(read_only=True)
 
    # ── Champs de coût exposés clairement ─────────────────────────────────────
    # labor_cost, parts_cost, total_cost sont déjà dans __all__
    # On ajoute un alias "estimated_cost" = labor_cost + parts_cost
    # AVANT clôture, le gestionnaire peut renseigner labor_cost + parts_cost
    # estimés ; après clôture ils deviennent les coûts réels.
 
    class Meta:
        model  = Maintenance
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_cost']
 
    def get_vehicle_name(self, obj):
        v = obj.vehicle
        if not v:
            return "—"
        return f"{v.make} {v.model}"
 
    def get_vehicle_registration(self, obj):          # ← AJOUT
        v = obj.vehicle
        return v.registration_number if v else "—"
 
    def get_vehicle_km(self, obj):                    # ← AJOUT
        v = obj.vehicle
        return float(v.current_mileage) if v and v.current_mileage else None
 
    def get_technician_name(self, obj):               # ← CORRIGÉ (évite crash si technician=None)
        if obj.technician:
            return obj.technician.get_full_name() or str(obj.technician)
        return None
 
    def to_representation(self, instance):
        """Ajoute des champs calculés supplémentaires dans la réponse."""
        data = super().to_representation(instance)
 
        # Alias frontend-friendly
        # Le frontend utilise "estimated_cost" → on l'expose comme labor_cost + parts_cost
        # avant clôture (ces champs peuvent être les estimations)
        data['estimated_cost'] = data.get('total_cost')   # total_cost = labor+parts auto-calculé
 
        # Alias done_date → end_date (le frontend utilise done_date)
        data['done_date'] = data.get('end_date')
 
        # Alias done_km → mileage_at_maintenance
        data['done_km'] = data.get('mileage_at_maintenance')
 
        # Alias actual_cost → total_cost (coût réel après clôture)
        data['actual_cost'] = data.get('total_cost')
 
        # Priorité : on expose le champ priorite s'il n'existe pas dans le modèle
        # (ajout défensif — utilise maintenance_type comme fallback)
        if 'priorite' not in data or not data.get('priorite'):
            data['priorite'] = 'NORMALE'
 
        # Type d'opération : expose le champ "type" que le frontend attend
        # Le modèle a "maintenance_type" (PREVENTIVE/CORRECTIVE/REGLEMENTAIRE)
        # Le frontend attend aussi un champ "type" (VIDANGE/PNEUS/etc.)
        # Si pas de champ "type", on met AUTRE par défaut
        if 'type' not in data or not data.get('type'):
            data['type'] = 'AUTRE'
 
        return data
 
 
class BreakdownSerializer(serializers.ModelSerializer):
    vehicle_name          = serializers.SerializerMethodField()
    reported_by_name      = serializers.SerializerMethodField()  # ← CORRIGÉ
    technician_name       = serializers.SerializerMethodField()  # ← CORRIGÉ
    resolution_time_hours = serializers.FloatField(read_only=True)
    is_critical           = serializers.BooleanField(read_only=True)
    photo_url             = serializers.SerializerMethodField()
    linked_maintenance_id = serializers.SerializerMethodField()
 

 
    class Meta:
        model  = Breakdown
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'reported_by', 'reported_date',
        ]
        extra_kwargs = {
            'location': {'required': False, 'allow_blank': True},
            'title':    {'required': True},
        }
 
    def get_vehicle_name(self, obj):
        v = obj.vehicle
        if not v:
            return "—"
        return f"{v.make} {v.model} — {v.registration_number}"
    def get_linked_maintenance_id(self, obj):
        if obj.maintenance:
            return obj.maintenance.id
        return None

    def get_reported_by_name(self, obj):              # ← CORRIGÉ
        if obj.reported_by:
            return obj.reported_by.get_full_name() or str(obj.reported_by)
        return None
 
    def get_technician_name(self, obj):               # ← CORRIGÉ
        if obj.assigned_technician:
            return obj.assigned_technician.get_full_name() or str(obj.assigned_technician)
        return None
 
    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
        return None
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['linked_maintenance_id'] = instance.maintenance_id  # FK id directement
        return data