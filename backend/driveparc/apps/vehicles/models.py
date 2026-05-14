"""
Modèles pour la gestion des véhicules
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel, ActiveManager
from core.constants import (
    VEHICLE_TYPES, VEHICLE_STATUS, FUEL_TYPES, TRANSMISSION_TYPES
)


class Vehicle(BaseModel):
    """
    Modèle représentant un véhicule du parc automobile
    """
    # Informations d'identification
    registration_number = models.CharField(
        _('Numéro d\'immatriculation'),
        max_length=50,
        unique=True
    )
    internal_code = models.CharField(
        _('Code interne'),
        max_length=50,
        unique=True,
        help_text="Code d'identification interne du véhicule"
    )
    
    # Caractéristiques du véhicule
    make = models.CharField(
        _('Marque'),
        max_length=100
    )
    model = models.CharField(
        _('Modèle'),
        max_length=100
    )
    year = models.IntegerField(
        _('Année de fabrication')
    )
    color = models.CharField(
        _('Couleur'),
        max_length=50
    )
    vehicle_type = models.CharField(
        _('Type de véhicule'),
        max_length=20,
        choices=VEHICLE_TYPES
    )
    VEHICLE_CATEGORY_CHOICES = [
        ("TOURISME",   "Tourisme"),     # Berlines, SUV, voitures de fonction
        ("UTILITAIRE", "Utilitaire"),   # Minibus, fourgons, pick-up
        ("BUS",        "Bus"),          # Bus scolaires, transport de groupe
    ]
    
    category = models.CharField(
        _('Catégorie'),
        max_length=20,
        choices=VEHICLE_CATEGORY_CHOICES,
        default="TOURISME",
        help_text="TOURISME=<10 places, UTILITAIRE=10-19 places, BUS=20+ places"
    )

    # 👇 Ajouter ces deux champs juste ici
    ASSIGNMENT_TYPE_CHOICES = [
        ("POOL",     "Parc commun"),
        ("FONCTION", "Voiture de fonction"),
        ("BUS_SCOLAIRE", "Bus scolaire"),
    ]
    assignment_type = models.CharField(
        _('Type d\'affectation'),
        max_length=20,
        choices=ASSIGNMENT_TYPE_CHOICES,
        default="POOL"
    )
    assigned_director = models.CharField(
        _('Directeur assigné'),
        max_length=150,
        blank=True,
        default=""
    )
    bus_driver = models.ForeignKey(
    'users.User',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='bus_assignments',
    verbose_name=_('Chauffeur bus assigné'),
    help_text="Uniquement pour les bus scolaires — ramassage matin"
    )
    fuel_type = models.CharField(
        _('Type de carburant'),
        max_length=20,
        choices=FUEL_TYPES
    )
    transmission = models.CharField(
        _('Transmission'),
        max_length=20,
        choices=TRANSMISSION_TYPES,
        default='MANUELLE'
    )
    
    # Capacités
    seating_capacity = models.IntegerField(
        _('Nombre de places'),
        default=5
    )
    fuel_tank_capacity = models.DecimalField(
        _('Capacité du réservoir (L)'),
        max_digits=6,
        decimal_places=2,
        help_text="Capacité du réservoir en litres"
    )
    
    # Kilométrage et consommation
    current_mileage = models.DecimalField(
        _('Kilométrage actuel'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    average_fuel_consumption = models.DecimalField(
        _('Consommation moyenne (L/100km)'),
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Statut et disponibilité
    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=VEHICLE_STATUS,
        default='DISPONIBLE'
    )
    
    # Dates importantes
    purchase_date = models.DateField(
        _('Date d\'achat'),
        null=True,
        blank=True
    )
    registration_date = models.DateField(
        _('Date d\'immatriculation'),
        null=True,
        blank=True
    )
    last_maintenance_date = models.DateField(
        _('Date de dernière maintenance'),
        null=True,
        blank=True
    )
    next_maintenance_date = models.DateField(
        _('Date de prochaine maintenance'),
        null=True,
        blank=True
    )
    
    # Informations financières
    purchase_price = models.DecimalField(
        _('Prix d\'achat'),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    current_value = models.DecimalField(
        _('Valeur actuelle'),
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Localisation GPS
    gps_enabled = models.BooleanField(
        _('GPS activé'),
        default=False
    )
    last_known_latitude = models.DecimalField(
        _('Dernière latitude connue'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    last_known_longitude = models.DecimalField(
        _('Dernière longitude connue'),
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )
    last_gps_update = models.DateTimeField(
        _('Dernière mise à jour GPS'),
        null=True,
        blank=True
    )
    
    # Autres informations
    vin_number = models.CharField(
        _('Numéro de châssis (VIN)'),
        max_length=17,
        unique=True,
        null=True,
        blank=True
    )
    engine_number = models.CharField(
        _('Numéro de moteur'),
        max_length=50,
        null=True,
        blank=True
    )
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    # Photo du véhicule
    photo = models.ImageField(
        _('Photo'),
        upload_to='vehicles/',
        null=True,
        blank=True
    )
    
    # Managers
    objects = models.Manager()
    active_objects = ActiveManager()
    
    class Meta:
        verbose_name = _('Véhicule')
        verbose_name_plural = _('Véhicules')
        ordering = ['registration_number']
        indexes = [
            models.Index(fields=['registration_number']),
            models.Index(fields=['internal_code']),
            models.Index(fields=['status']),
            models.Index(fields=['vehicle_type']),
        ]
    
    def __str__(self):
        return f"{self.make} {self.model} ({self.registration_number})"
    
    @property
    def is_available(self):
        """Vérifie si le véhicule est disponible"""
        return self.status == 'DISPONIBLE' and self.is_active
    
    @property
    def needs_maintenance(self):
        """Vérifie si le véhicule nécessite une maintenance"""
        if not self.next_maintenance_date:
            return False
        
        from django.utils import timezone
        from datetime import timedelta
        warning_date = timezone.now().date() + timedelta(days=7)
        return self.next_maintenance_date <= warning_date
    
    @property
    def is_under_maintenance(self):
        """Vérifie si le véhicule est en maintenance"""
        return self.status == 'EN_MAINTENANCE'
    
    @property
    def total_distance_traveled(self):
        """Calcule la distance totale parcourue"""
        return self.current_mileage
    
    def update_mileage(self, new_mileage):
        """
        Met à jour le kilométrage du véhicule
        
        Args:
            new_mileage (float): Nouveau kilométrage
        """
        if new_mileage > self.current_mileage:
            self.current_mileage = new_mileage
            self.save()
    
    def mark_as_available(self):
        """Marque le véhicule comme disponible"""
        self.status = 'DISPONIBLE'
        self.save()
    
    def mark_as_in_service(self):
        """Marque le véhicule comme en service"""
        self.status = 'EN_SERVICE'
        self.save()
    
    def mark_as_in_maintenance(self):
        """Marque le véhicule comme en maintenance"""
        self.status = 'EN_MAINTENANCE'
        self.save()
    
    def mark_as_out_of_service(self):
        """Marque le véhicule comme hors service"""
        self.status = 'HORS_SERVICE'
        self.save()


class VehicleAssignment(BaseModel):
    """
    Modèle pour l'affectation permanente d'un véhicule à un utilisateur
    """
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name=_('Véhicule')
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='vehicle_assignments',
        verbose_name=_('Utilisateur')
    )
    start_date = models.DateField(
        _('Date de début')
    )
    end_date = models.DateField(
        _('Date de fin'),
        null=True,
        blank=True,
        help_text="Laisser vide pour une affectation permanente"
    )
    is_permanent = models.BooleanField(
        _('Affectation permanente'),
        default=False
    )
    purpose = models.TextField(
        _('Objectif de l\'affectation'),
        blank=True,
        null=True
    )
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Affectation de véhicule')
        verbose_name_plural = _('Affectations de véhicules')
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.vehicle} → {self.user.get_full_name()}"
    
    @property
    def is_active_assignment(self):
        """Vérifie si l'affectation est active"""
        from django.utils import timezone
        today = timezone.now().date()
        
        if not self.is_active:
            return False
        
        if self.end_date:
            return self.start_date <= today <= self.end_date
        
        return self.start_date <= today

# apps/vehicles/models.py (ajout)

# apps/vehicles/models.py — ajoute ce modèle
# apps/vehicles/models.py — dans BusRoute
class BusRoute(models.Model):
    vehicle       = models.OneToOneField(Vehicle, on_delete=models.CASCADE, related_name='bus_route')
    ligne         = models.CharField(max_length=1)
    nom_trajet    = models.CharField(max_length=100)
    point_depart  = models.CharField(max_length=100)
    point_arrivee = models.CharField(max_length=100, default="IUC Logbessou")
    heure_depart  = models.TimeField(null=True, blank=True)   # ← ajoute
    heure_arrivee = models.TimeField(null=True, blank=True)   # ← ajoute
    nb_tours      = models.IntegerField(default=2)
    jours_service = models.JSONField(default=list)
    arrets        = models.JSONField(default=list, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

class BusRouteLog(models.Model):
    """Pointage journalier : le chauffeur confirme qu'il a effectué son trajet"""
    STATUS_CHOICES = [
        ('EFFECTUE',   'Effectué'),
        ('RETARD',     'Effectué avec retard'),
        ('ANNULE',     'Annulé'),
        ('INCIDENT',   'Incident signalé'),
    ]
    route         = models.ForeignKey(BusRoute, on_delete=models.CASCADE,
                                       related_name='logs')
    chauffeur     = models.ForeignKey('users.User', on_delete=models.CASCADE)
    date          = models.DateField()
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES,
                                      default='EFFECTUE')
    heure_depart_reelle  = models.TimeField(null=True, blank=True)
    heure_arrivee_reelle = models.TimeField(null=True, blank=True)
    nb_passagers  = models.IntegerField(default=0)
    commentaire   = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('route', 'date')  # un seul pointage par jour par trajet

    def __str__(self):
        return f"{self.route.ligne} — {self.date} — {self.status}"
class VehicleInsurance(BaseModel):
    """
    Modèle pour gérer les assurances des véhicules
    """
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='insurances',
        verbose_name=_('Véhicule')
    )
    insurance_company = models.CharField(
        _('Compagnie d\'assurance'),
        max_length=200
    )
    policy_number = models.CharField(
        _('Numéro de police'),
        max_length=100,
        unique=True
    )
    coverage_type = models.CharField(
        _('Type de couverture'),
        max_length=100,
        help_text="Ex: Tous risques, Tiers complet, etc."
    )
    start_date = models.DateField(
        _('Date de début')
    )
    end_date = models.DateField(
        _('Date de fin')
    )
    annual_premium = models.DecimalField(
        _('Prime annuelle'),
        max_digits=10,
        decimal_places=2
    )
    document = models.FileField(
        _('Document d\'assurance'),
        upload_to='insurances/',
        null=True,
        blank=True
    )
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Assurance véhicule')
        verbose_name_plural = _('Assurances véhicules')
        ordering = ['-end_date']
    
    def __str__(self):
        return f"Assurance {self.vehicle} - {self.insurance_company}"
    
    @property
    def is_valid(self):
        """Vérifie si l'assurance est valide"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date and self.is_active
    
    @property
    def expires_soon(self):
        """Vérifie si l'assurance expire bientôt (dans 30 jours)"""
        from django.utils import timezone
        from datetime import timedelta
        warning_date = timezone.now().date() + timedelta(days=30)
        return self.end_date <= warning_date


class VehicleDocument(BaseModel):
    """
    Modèle pour stocker les documents liés aux véhicules
    """
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_('Véhicule')
    )
    document_type = models.CharField(
        _('Type de document'),
        max_length=50,
        choices=[
            ('CARTE_GRISE', 'Carte grise'),
            ('VISITE_TECHNIQUE', 'Visite technique'),
            ('ASSURANCE', 'Assurance'),
            ('CONTRAT_ACHAT', 'Contrat d\'achat'),
            ('AUTRES', 'Autres'),
        ]
    )
    document_name = models.CharField(
        _('Nom du document'),
        max_length=200
    )
    document_file = models.FileField(
        _('Fichier'),
        upload_to='vehicle_documents/'
    )
    issue_date = models.DateField(
        _('Date d\'émission'),
        null=True,
        blank=True
    )
    expiry_date = models.DateField(
        _('Date d\'expiration'),
        null=True,
        blank=True
    )
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Document véhicule')
        verbose_name_plural = _('Documents véhicules')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.document_name} - {self.vehicle}"
    
    @property
    def is_expired(self):
        """Vérifie si le document est expiré"""
        if not self.expiry_date:
            return False
        
        from django.utils import timezone
        return self.expiry_date < timezone.now().date()
    
    @property
    def expires_soon(self):
        """Vérifie si le document expire bientôt"""
        if not self.expiry_date:
            return False
        
        from django.utils import timezone
        from datetime import timedelta
        warning_date = timezone.now().date() + timedelta(days=30)
        return self.expiry_date <= warning_date
