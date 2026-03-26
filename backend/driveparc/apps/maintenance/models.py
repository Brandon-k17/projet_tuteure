"""
Modèles pour la gestion de la maintenance et des pannes
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
from core.constants import (
    MAINTENANCE_TYPES, MAINTENANCE_STATUS, 
    BREAKDOWN_SEVERITY, BREAKDOWN_STATUS
)


class Maintenance(BaseModel):
    """
    Modèle pour les opérations de maintenance
    """
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='maintenances',
        verbose_name=_('Véhicule')
    )
    maintenance_type = models.CharField(
        _('Type de maintenance'),
        max_length=20,
        choices=MAINTENANCE_TYPES
    )
    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=MAINTENANCE_STATUS,
        default='PLANIFIE'
    )
    
    # Dates
    scheduled_date = models.DateField(
        _('Date prévue')
    )
    start_date = models.DateTimeField(
        _('Date de début'),
        null=True,
        blank=True
    )
    end_date = models.DateTimeField(
        _('Date de fin'),
        null=True,
        blank=True
    )
    
    # Personnel
    technician = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenances_performed',
        verbose_name=_('Technicien'),
        limit_choices_to={'role': 'TECHNICIEN'}
    )
    
    # Détails
    description = models.TextField(
        _('Description des travaux')
    )
    parts_replaced = models.TextField(
        _('Pièces remplacées'),
        blank=True,
        null=True
    )
    work_performed = models.TextField(
        _('Travaux effectués'),
        blank=True,
        null=True
    )
    
    # Kilométrage
    mileage_at_maintenance = models.DecimalField(
        _('Kilométrage lors de la maintenance'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    next_maintenance_mileage = models.DecimalField(
        _('Kilométrage de la prochaine maintenance'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Coûts
    labor_cost = models.DecimalField(
        _('Coût de la main d\'œuvre'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    parts_cost = models.DecimalField(
        _('Coût des pièces'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    total_cost = models.DecimalField(
        _('Coût total'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    # Documents
    invoice_document = models.FileField(
        _('Facture'),
        upload_to='maintenance/invoices/',
        null=True,
        blank=True
    )
    report_document = models.FileField(
        _('Rapport de maintenance'),
        upload_to='maintenance/reports/',
        null=True,
        blank=True
    )
    
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Maintenance')
        verbose_name_plural = _('Maintenances')
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['vehicle', 'status']),
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['maintenance_type']),
        ]
    
    def __str__(self):
        return f"Maintenance {self.maintenance_type} - {self.vehicle} ({self.scheduled_date})"
    
    @property
    def duration_hours(self):
        """Calcule la durée de la maintenance en heures"""
        if self.end_date and self.start_date:
            return (self.end_date - self.start_date).total_seconds() / 3600
        return None
    
    @property
    def is_overdue(self):
        """Vérifie si la maintenance est en retard"""
        from django.utils import timezone
        if self.status == 'PLANIFIE' and self.scheduled_date:
            return self.scheduled_date < timezone.now().date()
        return False
    
    def save(self, *args, **kwargs):
        """Calcule le coût total automatiquement"""
        self.total_cost = self.labor_cost + self.parts_cost
        super().save(*args, **kwargs)
    
    def start_maintenance(self):
        """Démarre la maintenance"""
        from django.utils import timezone
        self.status = 'EN_COURS'
        self.start_date = timezone.now()
        self.vehicle.mark_as_in_maintenance()
        self.save()
    
    def complete_maintenance(self):
        """Termine la maintenance"""
        from django.utils import timezone
        self.status = 'TERMINE'
        self.end_date = timezone.now()
        self.vehicle.last_maintenance_date = timezone.now().date()
        self.vehicle.mark_as_available()
        self.vehicle.save()
        self.save()


class Breakdown(BaseModel):
    """
    Modèle pour les pannes signalées
    """
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='breakdowns',
        verbose_name=_('Véhicule')
    )
    reported_by = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='breakdowns_reported',
        verbose_name=_('Signalé par')
    )
    assigned_technician = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='breakdowns_assigned',
        verbose_name=_('Technicien assigné'),
        limit_choices_to={'role': 'TECHNICIEN'}
    )
    
    # Détails de la panne
    title = models.CharField(
        _('Titre de la panne'),
        max_length=200
    )
    description = models.TextField(
        _('Description détaillée')
    )
    location = models.CharField(
        _('Localisation'),
        max_length=200,
        help_text="Lieu où la panne s'est produite"
    )
    
    # Dates
    reported_date = models.DateTimeField(
        _('Date de signalement'),
        auto_now_add=True
    )
    resolved_date = models.DateTimeField(
        _('Date de résolution'),
        null=True,
        blank=True
    )
    
    # Gravité et statut
    severity = models.CharField(
        _('Gravité'),
        max_length=20,
        choices=BREAKDOWN_SEVERITY,
        default='MOYENNE'
    )
    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=BREAKDOWN_STATUS,
        default='SIGNALE'
    )
    
    # Kilométrage au moment de la panne
    mileage_at_breakdown = models.DecimalField(
        _('Kilométrage au moment de la panne'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Diagnostic et réparation
    diagnosis = models.TextField(
        _('Diagnostic'),
        blank=True,
        null=True
    )
    repair_actions = models.TextField(
        _('Actions de réparation'),
        blank=True,
        null=True
    )
    parts_used = models.TextField(
        _('Pièces utilisées'),
        blank=True,
        null=True
    )
    
    # Coûts
    repair_cost = models.DecimalField(
        _('Coût de la réparation'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    
    # Lien avec la maintenance
    maintenance = models.ForeignKey(
        Maintenance,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='related_breakdowns',
        verbose_name=_('Maintenance associée')
    )
    
    # Documents
    photo = models.ImageField(
        _('Photo de la panne'),
        upload_to='breakdowns/photos/',
        null=True,
        blank=True
    )
    report_document = models.FileField(
        _('Rapport de réparation'),
        upload_to='breakdowns/reports/',
        null=True,
        blank=True
    )
    
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Panne')
        verbose_name_plural = _('Pannes')
        ordering = ['-reported_date']
        indexes = [
            models.Index(fields=['vehicle', 'status']),
            models.Index(fields=['severity']),
            models.Index(fields=['reported_date']),
        ]
    
    def __str__(self):
        return f"Panne - {self.title} ({self.vehicle})"
    
    @property
    def resolution_time_hours(self):
        """Calcule le temps de résolution en heures"""
        if self.resolved_date and self.reported_date:
            return (self.resolved_date - self.reported_date).total_seconds() / 3600
        return None
    
    @property
    def is_resolved(self):
        """Vérifie si la panne est résolue"""
        return self.status == 'REPARE'
    
    @property
    def is_critical(self):
        """Vérifie si la panne est critique"""
        return self.severity == 'CRITIQUE'
    
    def assign_technician(self, technician):
        """Assigne un technicien à la panne"""
        self.assigned_technician = technician
        self.status = 'EN_DIAGNOSTIC'
        self.save()
    
    def start_repair(self):
        """Démarre la réparation"""
        self.status = 'EN_REPARATION'
        self.vehicle.mark_as_in_maintenance()
        self.save()
    
    def mark_as_repaired(self):
        """Marque la panne comme réparée"""
        from django.utils import timezone
        self.status = 'REPARE'
        self.resolved_date = timezone.now()
        self.vehicle.mark_as_available()
        self.save()
    
    def mark_as_not_repairable(self):
        """Marque la panne comme non réparable"""
        from django.utils import timezone
        self.status = 'NON_REPARABLE'
        self.resolved_date = timezone.now()
        self.vehicle.mark_as_out_of_service()
        self.save()
