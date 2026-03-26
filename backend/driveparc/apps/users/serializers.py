"""
Serializers pour l'application users
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, DriverProfile, TechnicianProfile


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle User
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'role_display', 'department', 'employee_id',
            'profile_picture', 'email_verified', 'is_active',
            'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login', 'email_verified']


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
    """
    Serializer pour le profil chauffeur
    """
    user = UserSerializer(read_only=True)
    license_is_valid = serializers.BooleanField(read_only=True)
    license_expires_soon = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = DriverProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class TechnicianProfileSerializer(serializers.ModelSerializer):
    """
    Serializer pour le profil technicien
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TechnicianProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
