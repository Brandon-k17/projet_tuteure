from rest_framework import serializers
from .models import Reservation, PointageChauffeur


class ReservationSerializer(serializers.ModelSerializer):
    requester_name    = serializers.CharField(source='requester.get_full_name',      read_only=True)
    requester_full_name = serializers.CharField(source='requester.get_full_name',    read_only=True)
    requester_role    = serializers.CharField(source='requester.role',               read_only=True)
    driver_name       = serializers.CharField(source='driver.get_full_name',         read_only=True)
    approved_by_name  = serializers.CharField(source='approved_by.get_full_name',    read_only=True)
    status_display    = serializers.CharField(source='get_status_display',           read_only=True)
    vehicle_name      = serializers.SerializerMethodField()

    class Meta:
        model  = Reservation
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'requester', 'approved_by', 'approval_date',
            'requester_name', 'requester_full_name', 'requester_role',
            'driver_name', 'approved_by_name', 'status_display', 'vehicle_name',
        ]

    def get_vehicle_name(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.make} {obj.vehicle.model} · {obj.vehicle.registration_number}"
        return "Non assigné"

    def validate(self, data):
        start = data.get('start_date')
        end   = data.get('end_date')
        if start and end and end <= start:
            raise serializers.ValidationError({
                "end_date": "La date de fin doit être postérieure à la date de début."
            })
        return data


class PointageSerializer(serializers.ModelSerializer):
    chauffeur_name = serializers.CharField(source='chauffeur.get_full_name', read_only=True)
    vehicle_plate  = serializers.SerializerMethodField()

    class Meta:
        model  = PointageChauffeur
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'chauffeur', 'chauffeur_name', 'vehicle_plate', 'date',
        ]

    def get_vehicle_plate(self, obj):
        return obj.vehicle.registration_number if obj.vehicle else None

    def validate(self, data):
        status      = data.get('status', 'EFFECTUE')
        commentaire = data.get('commentaire', '').strip()
        if status in ('RETARD', 'ANNULE', 'INCIDENT') and not commentaire:
            raise serializers.ValidationError({
                'commentaire': f'Un commentaire est obligatoire pour le statut "{status}".'
            })
        return data