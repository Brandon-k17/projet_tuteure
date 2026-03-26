"""
Serializers pour l'application vehicles
"""

from rest_framework import serializers
from .models import Vehicle, VehicleAssignment, VehicleInsurance, VehicleDocument


class VehicleSerializer(serializers.ModelSerializer):
    """Serializer pour le modèle Vehicle"""
    
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    fuel_type_display = serializers.CharField(source='get_fuel_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    needs_maintenance = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehicleCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de véhicules"""
    
    class Meta:
        model = Vehicle
        exclude = ['created_at', 'updated_at']


class VehicleListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des véhicules"""
    
    class Meta:
        model = Vehicle
        fields = [
            'id', 'registration_number', 'internal_code', 'make', 'model',
            'year', 'vehicle_type', 'status', 'current_mileage', 'photo'
        ]


class VehicleAssignmentSerializer(serializers.ModelSerializer):
    """Serializer pour l'affectation de véhicules"""
    
    vehicle_details = VehicleListSerializer(source='vehicle', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    is_active_assignment = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = VehicleAssignment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehicleInsuranceSerializer(serializers.ModelSerializer):
    """Serializer pour les assurances véhicules"""
    
    vehicle_info = VehicleListSerializer(source='vehicle', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    expires_soon = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = VehicleInsurance
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class VehicleDocumentSerializer(serializers.ModelSerializer):
    """Serializer pour les documents véhicules"""
    
    vehicle_info = VehicleListSerializer(source='vehicle', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    expires_soon = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = VehicleDocument
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
