"""
Modèles pour la gestion des dépenses
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from core.models import BaseModel
from core.constants import EXPENSE_TYPES


class Expense(BaseModel):
    """
    Modèle pour toutes les dépenses liées aux véhicules
    """
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='expenses',
        verbose_name=_('Véhicule')
    )
    expense_type = models.CharField(
        _('Type de dépense'),
        max_length=20,
        choices=EXPENSE_TYPES
    )
    
    # Détails de la dépense
    title = models.CharField(
        _('Titre'),
        max_length=200
    )
    description = models.TextField(
        _('Description')
    )
    
    # Montant
    amount = models.DecimalField(
        _('Montant (XAF)'),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Dates
    expense_date = models.DateField(
        _('Date de la dépense')
    )
    payment_date = models.DateField(
        _('Date de paiement'),
        null=True,
        blank=True
    )
    
    # Fournisseur
    supplier_name = models.CharField(
        _('Nom du fournisseur'),
        max_length=200,
        blank=True,
        null=True
    )
    supplier_contact = models.CharField(
        _('Contact fournisseur'),
        max_length=100,
        blank=True,
        null=True
    )
    
    # Documents
    invoice_number = models.CharField(
        _('Numéro de facture'),
        max_length=100,
        blank=True,
        null=True
    )
    invoice_document = models.FileField(
        _('Document de facture'),
        upload_to='expenses/invoices/',
        null=True,
        blank=True
    )
    receipt_document = models.FileField(
        _('Reçu de paiement'),
        upload_to='expenses/receipts/',
        null=True,
        blank=True
    )
    
    # Statut de paiement
    is_paid = models.BooleanField(
        _('Payé'),
        default=False
    )
    payment_method = models.CharField(
        _('Méthode de paiement'),
        max_length=50,
        choices=[
            ('ESPECES', 'Espèces'),
            ('CHEQUE', 'Chèque'),
            ('VIREMENT', 'Virement bancaire'),
            ('CARTE', 'Carte bancaire'),
            ('CREDIT', 'À crédit'),
        ],
        blank=True,
        null=True
    )
    
    # Approbation
    approved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses_approved',
        verbose_name=_('Approuvé par')
    )
    approval_date = models.DateField(
        _('Date d\'approbation'),
        null=True,
        blank=True
    )
    
    # Référence
    reference_number = models.CharField(
        _('Numéro de référence'),
        max_length=100,
        unique=True,
        blank=True,
        null=True
    )
    
    # Kilométrage au moment de la dépense
    mileage_at_expense = models.DecimalField(
        _('Kilométrage au moment de la dépense'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Lien avec maintenance
    maintenance = models.ForeignKey(
        'maintenance.Maintenance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='related_expenses',
        verbose_name=_('Maintenance liée')
    )
    
    notes = models.TextField(
        _('Notes'),
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('Dépense')
        verbose_name_plural = _('Dépenses')
        ordering = ['-expense_date']
        indexes = [
            models.Index(fields=['vehicle', 'expense_type']),
            models.Index(fields=['expense_date']),
            models.Index(fields=['is_paid']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.amount} XAF ({self.expense_date})"
    
    @property
    def is_overdue(self):
        """Vérifie si le paiement est en retard"""
        if not self.is_paid and self.payment_date:
            from django.utils import timezone
            return self.payment_date < timezone.now().date()
        return False
    
    def mark_as_paid(self, payment_method, payment_date=None):
        """Marque la dépense comme payée"""
        from django.utils import timezone
        self.is_paid = True
        self.payment_method = payment_method
        self.payment_date = payment_date or timezone.now().date()
        self.save()


class Budget(BaseModel):
    """
    Modèle pour la gestion des budgets par période
    """
    title = models.CharField(
        _('Titre du budget'),
        max_length=200
    )
    description = models.TextField(
        _('Description'),
        blank=True,
        null=True
    )
    
    # Période
    start_date = models.DateField(
        _('Date de début')
    )
    end_date = models.DateField(
        _('Date de fin')
    )
    fiscal_year = models.IntegerField(
        _('Année fiscale')
    )
    
    # Montant
    total_budget = models.DecimalField(
        _('Budget total (XAF)'),
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    # Répartition par type de dépense
    fuel_budget = models.DecimalField(
        _('Budget carburant'),
        max_digits=12,
        decimal_places=2,
        default=0
    )
    maintenance_budget = models.DecimalField(
        _('Budget maintenance'),
        max_digits=12,
        decimal_places=2,
        default=0
    )
    insurance_budget = models.DecimalField(
        _('Budget assurance'),
        max_digits=12,
        decimal_places=2,
        default=0
    )
    other_budget = models.DecimalField(
        _('Autres budgets'),
        max_digits=12,
        decimal_places=2,
        default=0
    )
    
    # Approbation
    approved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='budgets_approved',
        verbose_name=_('Approuvé par')
    )
    is_approved = models.BooleanField(
        _('Approuvé'),
        default=False
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
        verbose_name = _('Budget')
        verbose_name_plural = _('Budgets')
        ordering = ['-fiscal_year', '-start_date']
        indexes = [
            models.Index(fields=['fiscal_year']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.fiscal_year})"
    
    @property
    def total_spent(self):
        """Calcule le total des dépenses pour la période"""
        from django.db.models import Sum
        total = Expense.objects.filter(
            expense_date__gte=self.start_date,
            expense_date__lte=self.end_date,
            is_paid=True
        ).aggregate(total=Sum('amount'))['total']
        return total or 0
    
    @property
    def remaining_budget(self):
        """Calcule le budget restant"""
        return self.total_budget - self.total_spent
    
    @property
    def budget_usage_percentage(self):
        """Calcule le pourcentage d'utilisation du budget"""
        if self.total_budget > 0:
            return (self.total_spent / self.total_budget) * 100
        return 0
    
    @property
    def is_exceeded(self):
        """Vérifie si le budget est dépassé"""
        return self.total_spent > self.total_budget
    
    @property
    def is_active(self):
        """Vérifie si le budget est actif pour la période actuelle"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date
    
    def get_expenses_by_type(self, expense_type):
        """Récupère les dépenses par type pour la période"""
        from django.db.models import Sum
        total = Expense.objects.filter(
            expense_type=expense_type,
            expense_date__gte=self.start_date,
            expense_date__lte=self.end_date,
            is_paid=True
        ).aggregate(total=Sum('amount'))['total']
        return total or 0
