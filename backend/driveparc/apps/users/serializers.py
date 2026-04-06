"""
Serializers pour l'application users
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, DriverProfile, TechnicianProfile


class UserSerializer(serializers.ModelSerializer):
    full_name        = serializers.CharField(source='get_full_name', read_only=True)
    role_display     = serializers.CharField(source='get_role_display', read_only=True)
    department_name  = serializers.CharField(source='department.name', read_only=True)
    driver_profile   = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'role_display', 'department', 'department_name',
            'employee_id', 'personnel_type', 'assigned_vehicle',
            'profile_picture', 'email_verified', 'is_active',
            'created_at', 'updated_at', 'last_login', 'driver_profile',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login', 'email_verified']

    def get_driver_profile(self, obj):
        try:
            p = obj.driver_profile
            return {
                "manual_status":        p.manual_status,
                "assignment_type":      p.assignment_type,
                "bus_slot_start":       str(p.bus_slot_start) if p.bus_slot_start else None,
                "bus_slot_end":         str(p.bus_slot_end)   if p.bus_slot_end   else None,
                "license_category":     p.license_category,
                "years_of_experience":  p.years_of_experience,
                "assigned_vehicle_info": {
                    "registration_number": p.assigned_vehicle.registration_number,
                    "make":  p.assigned_vehicle.make,
                    "model": p.assigned_vehicle.model,
                } if p.assigned_vehicle else None,
            }
        except Exception:
            return None

from .models import User, DriverProfile, TechnicianProfile, Department, StaffRegistry

class StaffRegistrySerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    full_name       = serializers.CharField(read_only=True)

    class Meta:
        model  = StaffRegistry
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'full_name',
            'department', 'department_name', 'role_hint', 'personnel_type_hint',
            'is_activated', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'is_activated', 'full_name', 'department_name']

class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer pour la création d'utilisateur
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 'last_name',
            'phone', 'role', 'department', 'employee_id'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas"})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserCreateWithVehicleSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, required=True)
    assigned_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.vehicles.models', fromlist=['Vehicle']).Vehicle.objects.filter(
            assignment_type='FONCTION'
        ),
        required=False, allow_null=True
    )

    class Meta:
        model  = User
        fields = [
            'email', 'password', 'first_name', 'last_name',
            'phone', 'role', 'personnel_type', 'department',
            'employee_id', 'assigned_vehicle',
        ]

    def validate_assigned_vehicle(self, vehicle):
        # Anti-doublon : véhicule déjà assigné à un autre directeur ?
        if vehicle and hasattr(vehicle, 'director_user'):
            existing = vehicle.director_user
            # Si on est en update, ignorer l'utilisateur actuel
            if self.instance and existing == self.instance:
                return vehicle
            raise serializers.ValidationError(
                f"Ce véhicule est déjà assigné à {existing.get_full_name()}."
            )
        return vehicle

    def validate_employee_id(self, value):
        """Le matricule doit exister dans le registre et ne pas être déjà activé."""
        if not value:
            raise serializers.ValidationError("Le matricule est obligatoire.")

        try:
            entry = StaffRegistry.objects.get(employee_id=value)
        except StaffRegistry.DoesNotExist:
            raise serializers.ValidationError(
                f"Matricule '{value}' introuvable dans le registre du personnel IUC. "
                "Ajoutez d'abord ce membre dans le registre."
            )

        if entry.is_activated:
            raise serializers.ValidationError(
                f"Un compte existe déjà pour le matricule '{value}' "
                f"({entry.full_name})."
            )

        return value

    def create(self, validated_data):
        password         = validated_data.pop('password')
        assigned_vehicle = validated_data.pop('assigned_vehicle', None)

        user = User.objects.create_user(password=password, **validated_data)

        # Marquer comme activé dans le registre
        StaffRegistry.objects.filter(
            employee_id=user.employee_id
        ).update(is_activated=True)

        if assigned_vehicle:
            user.assigned_vehicle = assigned_vehicle
            user.save()
            assigned_vehicle.assignment_type   = 'FONCTION'
            assigned_vehicle.assigned_director = user.get_full_name()
            assigned_vehicle.save()

        return user

    def update(self, instance, validated_data):
        password         = validated_data.pop('password', None)
        assigned_vehicle = validated_data.pop('assigned_vehicle', None)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)

        if password:
            instance.set_password(password)

        # Gérer le changement de véhicule
        if 'assigned_vehicle' in self.initial_data:
            old_vehicle = instance.assigned_vehicle

            # Libérer l'ancien véhicule
            if old_vehicle and old_vehicle != assigned_vehicle:
                old_vehicle.assignment_type   = 'POOL'
                old_vehicle.assigned_director = ''
                old_vehicle.save()

            # Assigner le nouveau
            instance.assigned_vehicle = assigned_vehicle
            if assigned_vehicle:
                assigned_vehicle.assignment_type   = 'FONCTION'
                assigned_vehicle.assigned_director = instance.get_full_name()
                assigned_vehicle.save()

        instance.save()
        return instance
from .models import User, DriverProfile, TechnicianProfile, Department

class DepartmentSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model  = Department
        fields = ['id', 'name', 'code', 'description', 'member_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'member_count']

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()
class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer pour la mise à jour d'utilisateur
    """
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'department',
            'employee_id', 'profile_picture'
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer pour le changement de mot de passe
    """
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Les mots de passe ne correspondent pas"})
        return attrs


class LoginSerializer(serializers.Serializer):
    """
    Serializer pour l'authentification
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(email=email, password=password)
            
            if not user:
                raise serializers.ValidationError("Email ou mot de passe incorrect")
            
            if not user.is_active:
                raise serializers.ValidationError("Ce compte est désactivé")
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError("Email et mot de passe requis")


class DriverProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    license_is_valid     = serializers.BooleanField(read_only=True)
    license_expires_soon = serializers.BooleanField(read_only=True)
    assigned_vehicle_info = serializers.SerializerMethodField()

    class Meta:
        model  = DriverProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_vehicle_info(self, obj):
        if obj.assigned_vehicle:
            return {
                "id": obj.assigned_vehicle.id,
                "registration_number": obj.assigned_vehicle.registration_number,
                "make": obj.assigned_vehicle.make,
                "model": obj.assigned_vehicle.model,
            }
        return None

class TechnicianProfileSerializer(serializers.ModelSerializer):
    """
    Serializer pour le profil technicien
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TechnicianProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
