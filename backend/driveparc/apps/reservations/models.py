from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from core.models import BaseModel
from django.conf import settings
from core.constants import RESERVATION_STATUS, RESERVATION_PRIORITIES


class Reservation(BaseModel):
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reservations',
        verbose_name=_('Véhicule'),
        help_text="Assigné par le gestionnaire après validation"
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
        null=True, blank=True,
        related_name='driving_assignments',
        verbose_name=_('Chauffeur assigné'),
        limit_choices_to={'role': 'CHAUFFEUR'}
    )
    start_date = models.DateTimeField(_('Date et heure de début'))
    end_date   = models.DateTimeField(_('Date et heure de fin'))
    actual_start_date = models.DateTimeField(_('Date de début effective'), null=True, blank=True)
    actual_end_date   = models.DateTimeField(_('Date de fin effective'),   null=True, blank=True)

    purpose              = models.TextField(_('Objectif de la réservation'))
    destination          = models.CharField(_('Destination'), max_length=200)
    number_of_passengers = models.IntegerField(_('Nombre de passagers'), default=1)
    estimated_distance   = models.DecimalField(_('Distance estimée (km)'), max_digits=7, decimal_places=2, null=True, blank=True)

    status   = models.CharField(_('Statut'),   max_length=20, choices=RESERVATION_STATUS,    default='EN_ATTENTE')
    priority = models.CharField(_('Priorité'), max_length=20, choices=RESERVATION_PRIORITIES, default='NORMALE')

    approved_by    = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations_approved', verbose_name=_('Approuvé par'))
    approval_date  = models.DateTimeField(_('Date d\'approbation'), null=True, blank=True)
    rejection_reason = models.TextField(_('Raison du rejet'), blank=True, null=True)

    start_mileage = models.DecimalField(_('Kilométrage de départ'), max_digits=10, decimal_places=2, null=True, blank=True)
    end_mileage   = models.DecimalField(_('Kilométrage d\'arrivée'), max_digits=10, decimal_places=2, null=True, blank=True)

    notes               = models.TextField(_('Notes'),                blank=True, null=True)
    cancellation_reason = models.TextField(_('Raison de l\'annulation'), blank=True, null=True)

    class Meta:
        verbose_name        = _('Réservation')
        verbose_name_plural = _('Réservations')
        ordering = ['-start_date']
        indexes  = [
            models.Index(fields=['status']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['vehicle', 'status']),
        ]

    def __str__(self):
        return f"Réservation {self.id} - {self.vehicle} ({self.get_status_display()})"

    def clean(self):
        if self.end_date and self.start_date and self.end_date <= self.start_date:
            raise ValidationError("La date de fin doit être postérieure à la date de début")

    @property
    def duration_hours(self):
        if self.end_date and self.start_date:
            return (self.end_date - self.start_date).total_seconds() / 3600
        return 0

    @property
    def distance_traveled(self):
        if self.end_mileage and self.start_mileage:
            return self.end_mileage - self.start_mileage
        return None

    def approve(self, approved_by):
        from django.utils import timezone
        self.status       = 'APPROUVEE'
        self.approved_by  = approved_by
        self.approval_date = timezone.now()
        self.save()

    def reject(self, rejected_by, reason):
        self.status          = 'REJETEE'
        self.rejection_reason = reason
        self.save()

    def cancel(self, reason):
        self.status              = 'ANNULEE'
        self.cancellation_reason = reason
        self.save()


class PointageChauffeur(BaseModel):
    STATUS_CHOICES = [
        ('EFFECTUE', 'Effectué'),
        ('RETARD',   'Effectué avec retard'),
        ('ANNULE',   'Annulé'),
        ('INCIDENT', 'Incident signalé'),
    ]

    chauffeur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pointages',
        limit_choices_to={'role': 'CHAUFFEUR'},
    )
    date                 = models.DateField()
    status               = models.CharField(max_length=20, choices=STATUS_CHOICES, default='EFFECTUE')
    heure_depart_reelle  = models.TimeField(null=True, blank=True)
    heure_arrivee_reelle = models.TimeField(null=True, blank=True)
    nb_passagers         = models.PositiveSmallIntegerField(default=0)
    commentaire          = models.TextField(blank=True, default='')
    vehicle              = models.ForeignKey(
        'vehicles.Vehicle', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pointages',
    )

    class Meta:
        db_table        = 'pointages_chauffeur'
        unique_together = ('chauffeur', 'date')
        ordering        = ['-date']

    def __str__(self):
        return f"Pointage {self.chauffeur} — {self.date} [{self.status}]"