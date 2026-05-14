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
            'employee_id','personnel_type', 'school', 'personnel_type', 'assigned_vehicle',
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

"""
UserCreateWithVehicleSerializer — version simplifiée
Remplace l'ancienne version dans apps/users/serializers.py
La seule contrainte : matricule unique + email unique (géré par Django)
Le registre est alimenté automatiquement à la création.
"""

from apps.vehicles.models import Vehicle  # ← ajouter en haut du fichier

class UserCreateWithVehicleSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, default="driveparc2026!")
    assigned_vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        required=False,
        allow_null=True
    )
    # Champs chauffeur optionnels
    driver_assignment_type = serializers.CharField(required=False, allow_blank=True)
    license_number         = serializers.CharField(required=False, allow_blank=True)
    license_category       = serializers.CharField(required=False, allow_blank=True)
    license_expiry_date    = serializers.DateField(required=False, allow_null=True)
    years_of_experience    = serializers.IntegerField(required=False, default=0)
    assigned_bus           = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model  = User
        fields = [
            'email', 'password', 'first_name', 'last_name',
            'phone', 'role', 'personnel_type', 'department',
            'employee_id', 'assigned_vehicle','school',
            'driver_assignment_type', 'license_number', 'license_category',
            'license_expiry_date', 'years_of_experience', 'assigned_bus',
        ]

    def validate_employee_id(self, value):
        if not value:
            raise serializers.ValidationError("Le matricule est obligatoire.")
        qs = User.objects.filter(employee_id=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f"Le matricule '{value}' est déjà utilisé."
            )
        return value

    def validate_assigned_vehicle(self, vehicle):
        if vehicle:
            # Vérifier si le véhicule est déjà utilisé par QUELQU'UN D'AUTRE
            # On suppose que le modèle Vehicle a un champ 'director_user' (OneToOne) 
            # ou que l'on cherche si un User pointe déjà dessus.
            existing_owner = User.objects.filter(assigned_vehicle=vehicle).first()
            
            if existing_owner:
                # Si on est en mise à jour et que c'est déjà notre véhicule, c'est OK
                if self.instance and existing_owner.pk == self.instance.pk:
                    return vehicle
                raise serializers.ValidationError(
                    f"Ce véhicule est déjà assigné à {existing_owner.get_full_name()}."
                )
        return vehicle

    def create(self, validated_data):
        password             = validated_data.pop('password')
        assigned_vehicle     = validated_data.pop('assigned_vehicle', None)
        driver_assignment_type = validated_data.pop('driver_assignment_type', 'POOL')
        license_number       = validated_data.pop('license_number', '')
        license_category     = validated_data.pop('license_category', 'B')
        license_expiry_date  = validated_data.pop('license_expiry_date', None)
        years_of_experience  = validated_data.pop('years_of_experience', 0)
        assigned_bus         = validated_data.pop('assigned_bus', None)

        final_password = password if password else "driveparc2026!"
        user = User.objects.create_user(password=final_password, **validated_data)

        # Créer le profil chauffeur si nécessaire
        if user.role == 'CHAUFFEUR' and license_number and license_expiry_date:
            from apps.users.models import DriverProfile
            DriverProfile.objects.create(
                user=user,
                assignment_type=driver_assignment_type,
                license_number=license_number,
                license_category=license_category or 'B',
                license_issue_date=license_expiry_date,  # temporaire
                license_expiry_date=license_expiry_date,
                years_of_experience=years_of_experience,
                assigned_vehicle=assigned_bus,
                manual_status='DISPONIBLE',
            )

        # Assigner véhicule directeur
        if assigned_vehicle:
            user.assigned_vehicle = assigned_vehicle
            user.save()
            assigned_vehicle.assignment_type   = 'FONCTION'
            assigned_vehicle.assigned_director = user.get_full_name()
            assigned_vehicle.save()

        # Alimenter le registre silencieusement
        try:
            from apps.users.models import StaffRegistry
            StaffRegistry.objects.update_or_create(
                employee_id=user.employee_id,
                defaults={
                    'first_name':          user.first_name,
                    'last_name':           user.last_name,
                    'department':          user.department,
                    'role_hint':           user.role if user.role in ['CHAUFFEUR','TECHNICIEN'] else 'PERSONNEL',
                    'personnel_type_hint': user.personnel_type or '',
                    'is_activated':        True,
                }
            )
        except Exception:
            pass

        return user

    def update(self, instance, validated_data):
        password             = validated_data.pop('password', None)
        assigned_vehicle     = validated_data.pop('assigned_vehicle', None)
        driver_assignment_type = validated_data.pop('driver_assignment_type', None)
        license_number       = validated_data.pop('license_number', None)
        license_category     = validated_data.pop('license_category', None)
        license_expiry_date  = validated_data.pop('license_expiry_date', None)
        years_of_experience  = validated_data.pop('years_of_experience', None)
        assigned_bus         = validated_data.pop('assigned_bus', None)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)

        if password:
            instance.set_password(password)

        # Gérer le véhicule directeur
        if 'assigned_vehicle' in self.initial_data:
            old = instance.assigned_vehicle
            if old and old != assigned_vehicle:
                old.assignment_type   = 'POOL'
                old.assigned_director = ''
                old.save()
            instance.assigned_vehicle = assigned_vehicle
            if assigned_vehicle:
                assigned_vehicle.assignment_type   = 'FONCTION'
                assigned_vehicle.assigned_director = instance.get_full_name()
                assigned_vehicle.save()

        instance.save()

        # Mettre à jour profil chauffeur si existe
        if instance.role == 'CHAUFFEUR':
            try:
                from apps.users.models import DriverProfile
                profile = instance.driver_profile
                if driver_assignment_type: profile.assignment_type = driver_assignment_type
                if license_number:         profile.license_number  = license_number
                if license_category:       profile.license_category = license_category
                if license_expiry_date:    profile.license_expiry_date = license_expiry_date
                if years_of_experience is not None: profile.years_of_experience = years_of_experience
                if assigned_bus is not None: profile.assigned_vehicle = assigned_bus
                profile.save()
            except Exception:
                pass

        return instance

class DepartmentSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model  = Department
        fields = ['id', 'name', 'code', 'school', 'description', 'member_count', 'created_at']
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
