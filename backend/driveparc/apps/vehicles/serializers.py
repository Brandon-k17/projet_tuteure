"""
Serializers pour l'application vehicles
"""

from rest_framework import serializers
from .models import Vehicle, VehicleAssignment, VehicleInsurance, VehicleDocument, BusRoute,BusRouteLog,BaseModel


class VehicleSerializer(serializers.ModelSerializer):
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    fuel_type_display    = serializers.CharField(source='get_fuel_type_display',    read_only=True)
    status_display       = serializers.CharField(source='get_status_display',       read_only=True)
    is_available         = serializers.BooleanField(read_only=True)
    needs_maintenance    = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Vehicle
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    # ← BIEN INDENTÉ dans la classe
    def validate(self, data):
        print("📥 DATA VALIDATE :", data)  # debug — retire après
        return data

# serializers.py
class VehicleDriverSerializer(serializers.ModelSerializer):
    """Serializer adapté au dashboard chauffeur"""
    brand         = serializers.CharField(source='make')
    license_plate = serializers.CharField(source='registration_number')
    mileage       = serializers.DecimalField(source='current_mileage', max_digits=10, decimal_places=2)
    fuel_level    = serializers.SerializerMethodField()
    bus_driver_info = serializers.SerializerMethodField()

    class Meta:
        model  = Vehicle
        fields = [
            'id', 'brand', 'license_plate', 'model', 'year',
            'status', 'mileage', 'fuel_level', 'category',
            'seating_capacity', 'assignment_type',
            'bus_slot_start', 'bus_slot_end',
            'bus_driver_info',
        ]

    def get_fuel_level(self, obj):
        # Si tu as un champ fuel_level sur le modèle, retourne-le
        # Sinon retourne None et le dashboard affiche "—"
        return getattr(obj, 'fuel_level', None)

    def get_bus_driver_info(self, obj):
        if obj.bus_driver:
            return {
                "id":        obj.bus_driver.id,
                "full_name": obj.bus_driver.get_full_name(),
            }
        return None
class VehicleCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de véhicules"""
    
    class Meta:
        model = Vehicle
        exclude = ['created_at', 'updated_at']

# apps/vehicles/serializers.py (ajout)

class ArretSerializer(serializers.Serializer):
    nom      = serializers.CharField()
    heure    = serializers.TimeField(required=False)

class BusRouteSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    logs_semaine = serializers.SerializerMethodField()

    # ← RETIRE cette ligne qui plante car le champ n'existe pas
    # chauffeur_name = serializers.CharField(source='chauffeur.get_full_name', read_only=True)

    class Meta:
        model  = BusRoute
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_vehicle_info(self, obj):
        return {
            'id':                  obj.vehicle.id,
            'registration_number': obj.vehicle.registration_number,
            'make':                obj.vehicle.make,
            'model':               obj.vehicle.model,
        }

    def get_logs_semaine(self, obj):
        from datetime import date, timedelta
        lundi = date.today() - timedelta(days=date.today().weekday())
        logs  = obj.logs.filter(date__gte=lundi)
        return BusRouteLogSerializer(logs, many=True).data

class BusRouteLogSerializer(serializers.ModelSerializer):
    chauffeur_name = serializers.CharField(source='chauffeur.get_full_name', read_only=True)
    route_ligne    = serializers.CharField(source='route.ligne', read_only=True)
    route_nom      = serializers.CharField(source='route.nom_trajet', read_only=True)

    class Meta:
        model  = BusRouteLog
        fields = '__all__'
        read_only_fields = ['chauffeur', 'created_at']

class VehicleListSerializer(serializers.ModelSerializer):
    bus_driver_info  = serializers.SerializerMethodField()
    director_user_id = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'registration_number', 'internal_code', 'make', 'model',
            'year', 'vehicle_type', 'status', 'current_mileage', 'photo',
            'category', 'assignment_type', 'assigned_director',
            'seating_capacity', 'bus_driver', 'bus_driver_info',
            'director_user_id',
            'color',
            'fuel_type',
            'transmission',
            'fuel_tank_capacity',
            'purchase_date',
            'registration_date',
            'purchase_price',
            'vin_number',
            'notes',
            # bus_slot_start et bus_slot_end sont sur DriverProfile, pas Vehicle
        ]

    def get_bus_driver_info(self, obj):
        if obj.bus_driver:
            return {
                "id":            obj.bus_driver.id,
                "full_name":     obj.bus_driver.get_full_name(),
                "phone":         obj.bus_driver.phone,
                "bus_slot_start": str(obj.bus_driver.driver_profile.bus_slot_start) if hasattr(obj.bus_driver, 'driver_profile') and obj.bus_driver.driver_profile.bus_slot_start else None,
                "bus_slot_end":   str(obj.bus_driver.driver_profile.bus_slot_end)   if hasattr(obj.bus_driver, 'driver_profile') and obj.bus_driver.driver_profile.bus_slot_end   else None,
            }
        return None

    def get_director_user_id(self, obj):
        try:
            return obj.director_user.id
        except Exception:
            return None

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
