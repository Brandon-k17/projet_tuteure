"""
Modèles pour la gestion du carburant
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from core.models import BaseModel
from core.constants import FUEL_VOUCHER_STATUS


class FuelVoucher(BaseModel):
    """
    Modèle pour les bons de carburant
    """
    code = models.CharField(
        _('Code du bon'),
        max_length=50,
        unique=True
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='fuel_vouchers',
        verbose_name=_('Véhicule')
    )
    issued_to = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='fuel_vouchers_received',
        verbose_name=_('Délivré à')
    )
    issued_by = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='fuel_vouchers_issued',
        verbose_name=_('Délivré par')
    )
    
    # Montant et quantité
    amount = models.DecimalField(
        _('Montant (XAF)'),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    quantity_liters = models.DecimalField(
        _('Quantité (Litres)'),
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True
    )
    
    # Dates
    issue_date = models.DateField(
        _('Date d\'émission')
    )
    valid_until = models.DateField(
        _('Valide jusqu\'au')
    )
    used_date = models.DateTimeField(
        _('Date d\'utilisation'),
        null=True,
        blank=True
    )
    
    # Statut
    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=FUEL_VOUCHER_STATUS,
        default='DISPONIBLE'
    )
    
    # Station service
    gas_station = models.CharField(
        _('Station service'),
        max_length=200,
        blank=True,
        null=True
    )
    
    # Période (mois/année)
    month = models.IntegerField(
        _('Mois'),
        validators=[MinValueValidator(1)],
        help_text="Mois d'allocation (1-12)"
    )
    year = models.IntegerField(
        _('Année')
    )
    
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Bon de carburant')
        verbose_name_plural = _('Bons de carburant')
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['vehicle', 'status']),
            models.Index(fields=['month', 'year']),
        ]
    
    def __str__(self):
        return f"Bon {self.code} - {self.vehicle}"
    
    @property
    def is_valid(self):
        """Vérifie si le bon est valide"""
        from django.utils import timezone
        today = timezone.now().date()
        return (
            self.status == 'DISPONIBLE' and
            self.issue_date <= today <= self.valid_until and
            self.is_active
        )
    
    @property
    def is_expired(self):
        """Vérifie si le bon est expiré"""
        from django.utils import timezone
        return self.valid_until < timezone.now().date()
    
    @property
    def is_used(self):
        """Vérifie si le bon a été utilisé"""
        return self.status == 'UTILISE'
    
    def use_voucher(self, gas_station=None):
        """Marque le bon comme utilisé"""
        from django.utils import timezone
        self.status = 'UTILISE'
        self.used_date = timezone.now()
        if gas_station:
            self.gas_station = gas_station
        self.save()
    
    def cancel_voucher(self):
        """Annule le bon"""
        self.status = 'ANNULE'
        self.save()


class FuelTransaction(BaseModel):
    """
    Modèle pour enregistrer les transactions de carburant
    """
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='fuel_transactions',
        verbose_name=_('Véhicule')
    )
    voucher = models.ForeignKey(
        FuelVoucher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
        verbose_name=_('Bon de carburant')
    )
    driver = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='fuel_transactions',
        verbose_name=_('Chauffeur'),
        limit_choices_to={'role': 'CHAUFFEUR'}
    )
    
    # Détails de la transaction
    transaction_date = models.DateTimeField(
        _('Date de la transaction')
    )
    gas_station = models.CharField(
        _('Station service'),
        max_length=200
    )
    
    # Quantité et coût
    quantity_liters = models.DecimalField(
        _('Quantité (Litres)'),
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    unit_price = models.DecimalField(
        _('Prix unitaire (XAF/L)'),
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    total_amount = models.DecimalField(
        _('Montant total (XAF)'),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Kilométrage
    mileage_at_refuel = models.DecimalField(
        _('Kilométrage lors du plein'),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Type de carburant
    fuel_type = models.CharField(
        _('Type de carburant'),
        max_length=50
    )
    
    # Reçu
    receipt_number = models.CharField(
        _('Numéro de reçu'),
        max_length=100,
        blank=True,
        null=True
    )
    receipt_photo = models.ImageField(
        _('Photo du reçu'),
        upload_to='fuel/receipts/',
        null=True,
        blank=True
    )
    
    # Méthode de paiement
    payment_method = models.CharField(
        _('Méthode de paiement'),
        max_length=50,
        choices=[
            ('BON', 'Bon de carburant'),
            ('ESPECES', 'Espèces'),
            ('CARTE', 'Carte bancaire'),
            ('CREDIT', 'À crédit'),
        ],
        default='BON'
    )
    
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Transaction carburant')
        verbose_name_plural = _('Transactions carburant')
        ordering = ['-transaction_date']
        indexes = [
            models.Index(fields=['vehicle', 'transaction_date']),
            models.Index(fields=['driver']),
            models.Index(fields=['transaction_date']),
        ]
    
    def __str__(self):
        return f"Plein {self.quantity_liters}L - {self.vehicle} ({self.transaction_date.date()})"
    
    def save(self, *args, **kwargs):
        """Calcule le montant total automatiquement"""
        if self.quantity_liters and self.unit_price:
            self.total_amount = self.quantity_liters * self.unit_price
        super().save(*args, **kwargs)
        
        # Mettre à jour le kilométrage du véhicule
        if self.mileage_at_refuel > self.vehicle.current_mileage:
            self.vehicle.current_mileage = self.mileage_at_refuel
            self.vehicle.save()


class MonthlyFuelAllocation(BaseModel):
    """
    Modèle pour l'allocation mensuelle de carburant par véhicule
    """
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='fuel_allocations',
        verbose_name=_('Véhicule')
    )
    month = models.IntegerField(
        _('Mois'),
        validators=[MinValueValidator(1)],
        help_text="Mois d'allocation (1-12)"
    )
    year = models.IntegerField(
        _('Année')
    )
    
    # Allocation
    allocated_amount = models.DecimalField(
        _('Montant alloué (XAF)'),
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    allocated_liters = models.DecimalField(
        _('Litres alloués'),
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True
    )
    
    # Utilisation
    used_amount = models.DecimalField(
        _('Montant utilisé (XAF)'),
        max_digits=10,
        decimal_places=2,
        default=0
    )
    used_liters = models.DecimalField(
        _('Litres utilisés'),
        max_digits=7,
        decimal_places=2,
        default=0
    )
    
    # Période
    approved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fuel_allocations_approved',
        verbose_name=_('Approuvé par')
    )
    approval_date = models.DateField(
        _('Date d\'approbation'),
        null=True,
        blank=True
    )
    
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Allocation mensuelle carburant')
        verbose_name_plural = _('Allocations mensuelles carburant')
        ordering = ['-year', '-month']
        unique_together = ['vehicle', 'month', 'year']
        indexes = [
            models.Index(fields=['vehicle', 'month', 'year']),
        ]
    
    def __str__(self):
        return f"Allocation {self.month}/{self.year} - {self.vehicle}"
    
    @property
    def remaining_amount(self):
        """Calcule le montant restant"""
        return self.allocated_amount - self.used_amount
    
    @property
    def remaining_liters(self):
        """Calcule les litres restants"""
        if self.allocated_liters:
            return self.allocated_liters - self.used_liters
        return None
    
    @property
    def usage_percentage(self):
        """Calcule le pourcentage d'utilisation"""
        if self.allocated_amount > 0:
            return (self.used_amount / self.allocated_amount) * 100
        return 0
    
    @property
    def is_exceeded(self):
        """Vérifie si l'allocation est dépassée"""
        return self.used_amount > self.allocated_amount
    
    def update_usage(self):
        """Met à jour l'utilisation basée sur les transactions"""
        from django.db.models import Sum
        
        transactions = FuelTransaction.objects.filter(
            vehicle=self.vehicle,
            transaction_date__year=self.year,
            transaction_date__month=self.month
        )
        
        totals = transactions.aggregate(
            total_amount=Sum('total_amount'),
            total_liters=Sum('quantity_liters')
        )
        
        self.used_amount = totals['total_amount'] or 0
        self.used_liters = totals['total_liters'] or 0
        self.save()
