"""
apps/fuel/models.py — Gestion carburant DRIVEPARC / IUC
Partenariat BOCOM : cartes magnétiques par véhicule
"""
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from core.models import BaseModel


CARD_CATEGORY = [
    ('BUS_SCOLAIRE',  'Bus scolaire'),
    ('BUS_ORDINAIRE', 'Bus ordinaire'),
    ('UTILITAIRE',    'Utilitaire / Tourisme'),
    ('FONCTION',      'Véhicule de fonction'),
]

MONTHLY_QUOTA = {
    'BUS_SCOLAIRE':  185_000,
    'BUS_ORDINAIRE': 125_000,
    'UTILITAIRE':    100_000,
    'FONCTION':      150_000,
}

TRANSACTION_TYPE = [
    ('RAMASSAGE', 'Ramassage scolaire'),
    ('MISSION',   'Mission / Réservation'),
    ('AUTRE',     'Autre'),
]

TRANSACTION_STATUS = [
    ('EN_ATTENTE',  'En attente de validation'),
    ('VALIDE',      'Validé'),
    ('REJETE',      'Rejeté'),
]


class FuelCard(BaseModel):
    """
    Carte magnétique BOCOM liée à un véhicule.
    Créée/rechargée par le gestionnaire, utilisée par le chauffeur.
    """
    vehicle = models.OneToOneField(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='fuel_card',
        verbose_name=_('Véhicule'),
    )
    card_number = models.CharField(
        _('Numéro de carte'), max_length=50, unique=True,
        help_text="Ex: 5288 **** **** 1234"
    )
    card_network = models.CharField(
        _('Réseau'), max_length=30, default='BOCOM',
        choices=[('BOCOM','BOCOM'),('TOTAL','TOTAL'),('TRADEX','TRADEX')],
    )
    category = models.CharField(
        _('Catégorie véhicule'), max_length=20,
        choices=CARD_CATEGORY, default='UTILITAIRE',
    )
    is_active = models.BooleanField(_('Active'), default=True)
    notes = models.TextField(_('Notes'), blank=True)

    class Meta:
        verbose_name = _('Carte carburant')
        verbose_name_plural = _('Cartes carburant')
        ordering = ['vehicle__registration_number']

    def __str__(self):
        return f"{self.card_network} {self.card_number} — {self.vehicle}"

    @property
    def monthly_quota(self):
        return MONTHLY_QUOTA.get(self.category, 100_000)

    # apps/fuel/models.py

    def balance_for_month(self, year, month):
        """Solde restant = allocation mensuelle - transactions validées du mois."""
        from django.db.models import Sum
        import calendar
        from datetime import datetime
        import pytz

        # Plage de dates explicite pour éviter les bugs de timezone
        tz = pytz.timezone('Africa/Douala')
        start = tz.localize(datetime(year, month, 1, 0, 0, 0))
        last_day = calendar.monthrange(year, month)[1]
        end = tz.localize(datetime(year, month, last_day, 23, 59, 59))

        alloc = MonthlyFuelAllocation.objects.filter(
            card=self, year=year, month=month
        ).first()
        budget = alloc.allocated_amount if alloc else self.monthly_quota

        used = FuelTransaction.objects.filter(
            card=self,
            status='VALIDE',
            transaction_date__gte=start,
            transaction_date__lte=end,
        ).aggregate(s=Sum('total_amount'))['s'] or 0

        return budget - used
    def current_balance(self):
        from django.utils import timezone
        now = timezone.now()
        return self.balance_for_month(now.year, now.month)


class MonthlyFuelAllocation(BaseModel):
    """Budget mensuel attribué à chaque carte (peut différer du quota par défaut)."""
    card = models.ForeignKey(
        FuelCard, on_delete=models.CASCADE,
        related_name='allocations', verbose_name=_('Carte'),
    )
    month = models.PositiveSmallIntegerField(_('Mois'))
    year  = models.PositiveSmallIntegerField(_('Année'))
    allocated_amount = models.DecimalField(
        _('Montant alloué (FCFA)'), max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    approved_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='fuel_allocations_approved',
    )
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('card', 'month', 'year')
        verbose_name = _('Allocation mensuelle carburant')
        verbose_name_plural = _('Allocations mensuelles carburant')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"Alloc {self.month}/{self.year} — {self.card}"

    @property
    def used_amount(self):
        from django.db.models import Sum
        import calendar
        from datetime import datetime
        import pytz
        tz = pytz.timezone('Africa/Douala')
        start = tz.localize(datetime(self.year, self.month, 1))
        last_day = calendar.monthrange(self.year, self.month)[1]
        end = tz.localize(datetime(self.year, self.month, last_day, 23, 59, 59))
        return FuelTransaction.objects.filter(
            card=self.card, status='VALIDE',
            transaction_date__gte=start,
            transaction_date__lte=end,
        ).aggregate(s=Sum('total_amount'))['s'] or 0

    @property
    def remaining_amount(self):
        return self.allocated_amount - self.used_amount

    @property
    def usage_pct(self):
        if self.allocated_amount:
            return round(float(self.used_amount / self.allocated_amount) * 100, 1)
        return 0


class FuelTransaction(BaseModel):
    """
    Saisie de consommation carburant par le chauffeur.
    Rattachée à la carte du véhicule assigné.
    Si type=MISSION, le champ reservation est obligatoire.
    """
    card = models.ForeignKey(
        FuelCard, on_delete=models.CASCADE,
        related_name='transactions', verbose_name=_('Carte'),
    )
    driver = models.ForeignKey(
    'users.User', on_delete=models.CASCADE,
    related_name='fuel_transactions_done',
    verbose_name=_('Chauffeur'),
    )
    reservation = models.ForeignKey(
        'reservations.Reservation',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='fuel_transactions',
        verbose_name=_('Mission liée'),
    )
    transaction_type = models.CharField(
        _('Type'), max_length=20,
        choices=TRANSACTION_TYPE, default='RAMASSAGE',
    )
    transaction_date = models.DateTimeField(_('Date'))
    gas_station      = models.CharField(_('Station service'), max_length=200, blank=True)

    # Consommation
    quantity_liters = models.DecimalField(
        _('Litres'), max_digits=7, decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    unit_price = models.DecimalField(
        _('Prix/litre (FCFA)'), max_digits=8, decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    total_amount = models.DecimalField(
        _('Montant total (FCFA)'), max_digits=12, decimal_places=2,
        default=0,
    )
    mileage_at_refuel = models.DecimalField(
        _('Kilométrage'), max_digits=10, decimal_places=0,
        validators=[MinValueValidator(0)], null=True, blank=True,
    )

    # Justificatif
    receipt_photo = models.ImageField(
        _('Reçu'), upload_to='fuel/receipts/%Y/%m/', null=True, blank=True,
    )
    receipt_number = models.CharField(max_length=100, blank=True)

    status = models.CharField(
        _('Statut'), max_length=20,
        choices=TRANSACTION_STATUS, default='EN_ATTENTE',
    )
    validated_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='fuel_validations',
    )
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = _('Transaction carburant')
        verbose_name_plural = _('Transactions carburant')
        ordering = ['-transaction_date']
        indexes = [
            models.Index(fields=['card', 'transaction_date']),
            models.Index(fields=['driver', 'status']),
        ]

    def __str__(self):
        return f"{self.quantity_liters}L — {self.card.vehicle} ({self.transaction_date.date()})"

    def save(self, *args, **kwargs):
        if self.quantity_liters and self.unit_price:
            self.total_amount = self.quantity_liters * self.unit_price
        super().save(*args, **kwargs)
        # Mettre à jour le kilométrage du véhicule
        if self.mileage_at_refuel and self.card.vehicle.current_mileage:
            if self.mileage_at_refuel > self.card.vehicle.current_mileage:
                self.card.vehicle.current_mileage = self.mileage_at_refuel
                self.card.vehicle.save(update_fields=['current_mileage'])