"""
Modèles de gestion des utilisateurs et rôles
"""

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
from core.constants import USER_ROLES


class UserManager(BaseUserManager):
    """
    Manager personnalisé pour le modèle User
    """
    
    def create_user(self, email, password=None, **extra_fields):
        """
        Crée et sauvegarde un utilisateur normal
        """
        if not email:
            raise ValueError(_('L\'adresse email est obligatoire'))
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Crée et sauvegarde un superutilisateur
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    Modèle utilisateur personnalisé avec gestion des rôles
    """
    email = models.EmailField(
        _('Adresse email'),
        unique=True,
        max_length=255
    )
    first_name = models.CharField(
        _('Prénom'),
        max_length=100
    )
    last_name = models.CharField(
        _('Nom'),
        max_length=100
    )
    phone = models.CharField(
        _('Téléphone'),
        max_length=20,
        blank=True,
        null=True
    )
    role = models.CharField(
        _('Rôle'),
        max_length=20,
        choices=USER_ROLES,
        default='PERSONNEL'
    )
    department = models.CharField(
        _('Département'),
        max_length=100,
        blank=True,
        null=True,
        help_text="Service ou département d'appartenance"
    )
    employee_id = models.CharField(
        _('Matricule'),
        max_length=50,
        unique=True,
        blank=True,
        null=True
    )
    profile_picture = models.ImageField(
        _('Photo de profil'),
        upload_to='profiles/',
        blank=True,
        null=True
    )
    is_staff = models.BooleanField(
        _('Membre du staff'),
        default=False,
        help_text=_('Désigne si l\'utilisateur peut se connecter à l\'admin')
    )
    is_superuser = models.BooleanField(
        _('Superutilisateur'),
        default=False
    )
    email_verified = models.BooleanField(
        _('Email vérifié'),
        default=False
    )
    last_login = models.DateTimeField(
        _('Dernière connexion'),
        blank=True,
        null=True
    )
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        verbose_name = _('Utilisateur')
        verbose_name_plural = _('Utilisateurs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['employee_id']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"
    
    def get_full_name(self):
        """Retourne le nom complet de l'utilisateur"""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Retourne le prénom de l'utilisateur"""
        return self.first_name
    
    @property
    def is_admin(self):
        """Vérifie si l'utilisateur est administrateur"""
        return self.role == 'ADMIN'
    
    @property
    def is_fleet_manager(self):
        """Vérifie si l'utilisateur est gestionnaire de parc"""
        return self.role == 'GESTIONNAIRE'
    
    @property
    def is_driver(self):
        """Vérifie si l'utilisateur est chauffeur"""
        return self.role == 'CHAUFFEUR'
    
    @property
    def is_technician(self):
        """Vérifie si l'utilisateur est technicien"""
        return self.role == 'TECHNICIEN'
    
    @property
    def can_manage_vehicles(self):
        """Vérifie si l'utilisateur peut gérer les véhicules"""
        return self.role in ['ADMIN', 'GESTIONNAIRE']
    
    @property
    def can_approve_reservations(self):
        """Vérifie si l'utilisateur peut approuver des réservations"""
        return self.role in ['ADMIN', 'GESTIONNAIRE']


class DriverProfile(BaseModel):
    """
    Profil spécifique pour les chauffeurs
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='driver_profile',
        verbose_name=_('Utilisateur')
    )
    license_number = models.CharField(
        _('Numéro de permis'),
        max_length=50,
        unique=True
    )
    license_category = models.CharField(
        _('Catégorie de permis'),
        max_length=10,
        help_text="Ex: A, B, C, D, E"
    )
    license_issue_date = models.DateField(
        _('Date d\'obtention du permis')
    )
    license_expiry_date = models.DateField(
        _('Date d\'expiration du permis')
    )
    years_of_experience = models.IntegerField(
        _('Années d\'expérience'),
        default=0
    )
    is_available = models.BooleanField(
        _('Disponible'),
        default=True
    )
    emergency_contact_name = models.CharField(
        _('Contact d\'urgence - Nom'),
        max_length=100,
        blank=True,
        null=True
    )
    emergency_contact_phone = models.CharField(
        _('Contact d\'urgence - Téléphone'),
        max_length=20,
        blank=True,
        null=True
    )
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Profil chauffeur')
        verbose_name_plural = _('Profils chauffeurs')
        ordering = ['user__last_name']
    
    def __str__(self):
        return f"Chauffeur: {self.user.get_full_name()}"
    
    @property
    def license_is_valid(self):
        """Vérifie si le permis est encore valide"""
        from django.utils import timezone
        return self.license_expiry_date > timezone.now().date()
    
    @property
    def license_expires_soon(self):
        """Vérifie si le permis expire dans moins de 30 jours"""
        from django.utils import timezone
        from datetime import timedelta
        warning_date = timezone.now().date() + timedelta(days=30)
        return self.license_expiry_date <= warning_date


class TechnicianProfile(BaseModel):
    """
    Profil spécifique pour les techniciens/mécaniciens
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='technician_profile',
        verbose_name=_('Utilisateur')
    )
    specialization = models.CharField(
        _('Spécialisation'),
        max_length=100,
        help_text="Ex: Mécanique, Électricité, Carrosserie"
    )
    certifications = models.TextField(
        _('Certifications'),
        blank=True,
        null=True,
        help_text="Liste des certifications professionnelles"
    )
    years_of_experience = models.IntegerField(
        _('Années d\'expérience'),
        default=0
    )
    is_available = models.BooleanField(
        _('Disponible'),
        default=True
    )
    
    class Meta:
        verbose_name = _('Profil technicien')
        verbose_name_plural = _('Profils techniciens')
        ordering = ['user__last_name']
    
    def __str__(self):
        return f"Technicien: {self.user.get_full_name()} - {self.specialization}"
