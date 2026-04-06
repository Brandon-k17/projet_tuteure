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

class Department(BaseModel):
    """Département de l'institution"""
    name = models.CharField(_('Nom'), max_length=150, unique=True)
    code = models.CharField(_('Code'), max_length=20, unique=True, blank=True, default="")
    description = models.TextField(_('Description'), blank=True, null=True)

    class Meta:
        verbose_name = _('Département')
        verbose_name_plural = _('Départements')
        ordering = ['name']

    def __str__(self):
        return self.name
class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    Modèle utilisateur personnalisé avec gestion des rôles
    """
    email = models.EmailField(
        _('Adresse email'),
        unique=True,
        max_length=191
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
    PERSONNEL_TYPE_CHOICES = [
    ("DIRECTEUR",  "Directeur"),
    ("CHEF_DEPT",  "Chef de département"),
    ("AUTRE",      "Autre personnel"),
]
    personnel_type = models.CharField(
        _('Type de personnel'),
        max_length=20,
        choices=PERSONNEL_TYPE_CHOICES,
        blank=True,
        default=""
    )
    assigned_vehicle = models.OneToOneField(
        'vehicles.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='director_user',
        verbose_name=_('Véhicule de fonction assigné'),
        help_text="Uniquement pour les directeurs"
    )
    department = models.ForeignKey(
    'Department',
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='members',
    verbose_name=_('Département')
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

class StaffRegistry(BaseModel):
    """
    Registre officiel du personnel IUC.
    Tout compte utilisateur doit correspondre à une entrée ici.
    """
    ROLE_HINT_CHOICES = [
        ("PERSONNEL",  "Personnel"),
        ("CHAUFFEUR",  "Chauffeur"),
        ("TECHNICIEN", "Technicien"),
    ]
    PERSONNEL_TYPE_HINT = [
        ("DIRECTEUR",  "Directeur"),
        ("CHEF_DEPT",  "Chef de département"),
        ("AUTRE",      "Autre personnel"),
    ]

    employee_id       = models.CharField(
        _('Matricule'), max_length=50, unique=True
    )
    first_name        = models.CharField(_('Prénom'), max_length=100)
    last_name         = models.CharField(_('Nom'),    max_length=100)
    department        = models.ForeignKey(
        'Department', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='registry_members'
    )
    role_hint         = models.CharField(
        _('Rôle suggéré'), max_length=20,
        choices=ROLE_HINT_CHOICES, default='PERSONNEL'
    )
    personnel_type_hint = models.CharField(
        _('Type suggéré'), max_length=20,
        choices=PERSONNEL_TYPE_HINT, blank=True, default=''
    )
    is_activated      = models.BooleanField(
        _('Compte créé'), default=False,
        help_text="True si un compte utilisateur existe déjà pour ce matricule"
    )
    notes             = models.TextField(_('Notes'), blank=True, null=True)

    class Meta:
        verbose_name        = _('Registre du personnel')
        verbose_name_plural = _('Registre du personnel')
        ordering            = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.employee_id} — {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
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
    DRIVER_ASSIGNMENT_CHOICES = [
        ("POOL",         "Chauffeur polyvalent"),
        ("BUS_SCOLAIRE", "Chauffeur bus scolaire"),
    ]
    assignment_type = models.CharField(
        _('Type d\'affectation'),
        max_length=20,
        choices=DRIVER_ASSIGNMENT_CHOICES,
        default="POOL"
    )
    assigned_vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_driver',
        verbose_name=_('Bus assigné'),
        help_text="Uniquement pour les chauffeurs bus scolaire"
    )

    # ── Créneau bloqué bus scolaire (matin uniquement) ────────────────
    bus_slot_start = models.TimeField(
        _('Début créneau bus'),
        null=True, blank=True,
        default=None,
        help_text="Ex: 05:00 — automatique si BUS_SCOLAIRE"
    )
    bus_slot_end = models.TimeField(
        _('Fin créneau bus'),
        null=True, blank=True,
        default=None,
        help_text="Ex: 08:30"
    )

    # ── Statut manuel (mis à jour par le chauffeur depuis son dashboard) ─
    MANUAL_STATUS_CHOICES = [
        ("DISPONIBLE",   "Disponible"),
        ("EN_MISSION",   "En mission"),
        ("INDISPONIBLE", "Indisponible"),
        ("CONGE",        "En congé"),
    ]
    manual_status = models.CharField(
        _('Statut manuel'),
        max_length=20,
        choices=MANUAL_STATUS_CHOICES,
        default="DISPONIBLE"
    )
    
    class Meta:
        verbose_name = _('Profil chauffeur')
        verbose_name_plural = _('Profils chauffeurs')
        ordering = ['user__last_name']
    
    def __str__(self):
        return f"Chauffeur: {self.user.get_full_name()}"
    def is_available_for(self, start_dt, end_dt):
        """
        Vérifie si le chauffeur est disponible pour une plage donnée.
        start_dt, end_dt : datetime objects
        """
        from datetime import time

        # 1. Statut manuel
        if self.manual_status != "DISPONIBLE":
            return False, f"Statut : {self.get_manual_status_display()}"

        # 2. Créneau bus scolaire bloqué (matin)
        if self.assignment_type == "BUS_SCOLAIRE" and self.bus_slot_start and self.bus_slot_end:
            req_time = start_dt.time()
            if self.bus_slot_start <= req_time <= self.bus_slot_end:
                return False, f"Bus scolaire {self.bus_slot_start.strftime('%Hh%M')}–{self.bus_slot_end.strftime('%Hh%M')}"

        # 3. Déjà sur une mission (réservation EN_COURS ou APPROUVEE qui chevauche)
        from apps.reservations.models import Reservation
        conflict = Reservation.objects.filter(
            driver=self.user,
            status__in=["APPROUVEE", "EN_COURS"],
            start_date__lt=end_dt,
            end_date__gt=start_dt,
        ).exists()
        if conflict:
            return False, "Déjà en mission sur cette plage"

        return True, "Disponible"
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
