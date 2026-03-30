from rest_framework import serializers
from .models import Reservation
 
 
class ReservationSerializer(serializers.ModelSerializer):
    # Champs calculés en lecture seule
    requester_name   = serializers.CharField(source='requester.get_full_name', read_only=True)
    requester_role   = serializers.CharField(source='requester.role',          read_only=True)
    vehicle_name     = serializers.SerializerMethodField()
    driver_name      = serializers.CharField(source='driver.get_full_name',    read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    status_display   = serializers.CharField(source='get_status_display',      read_only=True)
 
    class Meta:
        model  = Reservation
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            # Auto-injectés par la vue (perform_create / perform_update)
            'requester', 'approved_by', 'approval_date',
            # Calculés
            'requester_name', 'requester_role', 'vehicle_name',
            'driver_name', 'approved_by_name', 'status_display',
        ]
 
    def get_vehicle_name(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.brand} {obj.vehicle.model} · {obj.vehicle.license_plate}"
        return "Non assigné"
 
    def validate(self, data):
        """Validation des dates."""
        start = data.get('start_date')
        end   = data.get('end_date')
        if start and end and end <= start:
            raise serializers.ValidationError({
                "end_date": "La date de fin doit être postérieure à la date de début."
            })
        return data
 