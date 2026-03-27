"""
Modèles pour la gestion des réservations
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from core.models import BaseModel
from core.constants import RESERVATION_STATUS, RESERVATION_PRIORITIES


class Reservation(BaseModel):
    """
    Modèle pour les réservations de véhicules
    """
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='reservations',
        verbose_name=_('Véhicule')
    )
    requester = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='reservations_made',
        verbose_name=_('Demandeur')
    )
    driver = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='driving_assignments',
        verbose_name=_('Chauffeur assigné'),
        limit_choices_to={'role': 'CHAUFFEUR'}
    )
    
    # Dates et durée
    start_date = models.DateTimeField(
        _('Date et heure de début')
    )
    end_date = models.DateTimeField(
        _('Date et heure de fin')
    )
    actual_start_date = models.DateTimeField(
        _('Date de début effective'),
        null=True,
        blank=True
    )
    actual_end_date = models.DateTimeField(
        _('Date de fin effective'),
        null=True,
        blank=True
    )
    
    # Détails de la réservation
    purpose = models.TextField(
        _('Objectif de la réservation')
    )
    destination = models.CharField(
        _('Destination'),
        max_length=200
    )
    number_of_passengers = models.IntegerField(
        _('Nombre de passagers'),
        default=1
    )
    estimated_distance = models.DecimalField(
        _('Distance estimée (km)'),
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Statut et priorité
    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=RESERVATION_STATUS,
        default='EN_ATTENTE'
    )
    priority = models.CharField(
        _('Priorité'),
        max_length=20,
        choices=RESERVATION_PRIORITIES,
        default='NORMALE'
    )
    
    # Gestion de la demande
    approved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reservations_approved',
        verbose_name=_('Approuvé par')
    )
    approval_date = models.DateTimeField(
        _('Date d\'approbation'),
        null=True,
        blank=True
    )
    rejection_reason = models.TextField(
        _('Raison du rejet'),
        blank=True,
        null=True
    )
    
    # Kilométrage
    start_mileage = models.DecimalField(
        _('Kilométrage de départ'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    end_mileage = models.DecimalField(
        _('Kilométrage d\'arrivée'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Notes
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    cancellation_reason = models.TextField(
        _('Raison de l\'annulation'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Réservation')
        verbose_name_plural = _('Réservations')
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['vehicle', 'status']),
        ]
    
    def __str__(self):
        return f"Réservation {self.id} - {self.vehicle} ({self.get_status_display()})"
    
    def clean(self):
        """Validation des dates"""
        if self.end_date and self.start_date:
            if self.end_date <= self.start_date:
                raise ValidationError("La date de fin doit être postérieure à la date de début")
        
        # Vérifier le nombre de passagers
        if self.number_of_passengers > self.vehicle.seating_capacity:
            raise ValidationError(
                f"Le nombre de passagers ({self.number_of_passengers}) dépasse "
                f"la capacité du véhicule ({self.vehicle.seating_capacity})"
            )
    
    @property
    def duration_days(self):
        """Calcule la durée en jours"""
        if self.end_date and self.start_date:
            return (self.end_date - self.start_date).days
        return 0
    
    @property
    def duration_hours(self):
        """Calcule la durée en heures"""
        if self.end_date and self.start_date:
            return (self.end_date - self.start_date).total_seconds() / 3600
        return 0
    
    @property
    def distance_traveled(self):
        """Calcule la distance réellement parcourue"""
        if self.end_mileage and self.start_mileage:
            return self.end_mileage - self.start_mileage
        return None
    
    @property
    def is_pending(self):
        """Vérifie si la réservation est en attente"""
        return self.status == 'EN_ATTENTE'
    
    @property
    def is_approved(self):
        """Vérifie si la réservation est approuvée"""
        return self.status == 'APPROUVEE'
    
    @property
    def is_active(self):
        """Vérifie si la réservation est en cours"""
        return self.status == 'EN_COURS'
    
    @property
    def is_completed(self):
        """Vérifie si la réservation est terminée"""
        return self.status == 'TERMINEE'
    
    def approve(self, approved_by):
        """Approuve la réservation"""
        from django.utils import timezone
        self.status = 'APPROUVEE'
        self.approved_by = approved_by
        self.approval_date = timezone.now()
        self.save()
    
    def reject(self, rejected_by, reason):
        """Rejette la réservation"""
        self.status = 'REJETEE'
        self.rejection_reason = reason
        self.save()
    
    def start(self, start_mileage):
        """Démarre la réservation"""
        from django.utils import timezone
        self.status = 'EN_COURS'
        self.actual_start_date = timezone.now()
        self.start_mileage = start_mileage
        self.vehicle.mark_as_in_service()
        self.save()
    
    def complete(self, end_mileage):
        """Termine la réservation"""
        from django.utils import timezone
        self.status = 'TERMINEE'
        self.actual_end_date = timezone.now()
        self.end_mileage = end_mileage
        
        # Mettre à jour le kilométrage du véhicule
        if end_mileage > self.vehicle.current_mileage:
            self.vehicle.current_mileage = end_mileage
            self.vehicle.save()
        
        self.vehicle.mark_as_available()
        self.save()
    
    def cancel(self, reason):
        """Annule la réservation"""
        self.status = 'ANNULEE'
        self.cancellation_reason = reason
        self.save()
