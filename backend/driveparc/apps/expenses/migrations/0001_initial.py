import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('vehicles', '0001_initial'),
        ('maintenance', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Expense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='expenses', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('expense_type', models.CharField(
                    choices=[
                        ('CARBURANT', 'Carburant'), ('MAINTENANCE', 'Maintenance'),
                        ('REPARATION', 'Réparation'), ('ASSURANCE', 'Assurance'),
                        ('TAXES', 'Taxes'), ('PIECES', 'Pièces détachées'), ('AUTRES', 'Autres'),
                    ],
                    max_length=20,
                    verbose_name='Type de dépense',
                )),
                ('title', models.CharField(max_length=200, verbose_name='Titre')),
                ('description', models.TextField(verbose_name='Description')),
                ('amount', models.DecimalField(
                    decimal_places=2,
                    max_digits=12,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Montant (XAF)',
                )),
                ('expense_date', models.DateField(verbose_name='Date de la dépense')),
                ('payment_date', models.DateField(blank=True, null=True, verbose_name='Date de paiement')),
                ('supplier_name', models.CharField(blank=True, max_length=200, null=True, verbose_name='Nom du fournisseur')),
                ('supplier_contact', models.CharField(blank=True, max_length=100, null=True, verbose_name='Contact fournisseur')),
                ('invoice_number', models.CharField(blank=True, max_length=100, null=True, verbose_name='Numéro de facture')),
                ('invoice_document', models.FileField(blank=True, null=True, upload_to='expenses/invoices/', verbose_name='Document de facture')),
                ('receipt_document', models.FileField(blank=True, null=True, upload_to='expenses/receipts/', verbose_name='Reçu de paiement')),
                ('is_paid', models.BooleanField(default=False, verbose_name='Payé')),
                ('payment_method', models.CharField(
                    blank=True,
                    choices=[
                        ('ESPECES', 'Espèces'), ('CHEQUE', 'Chèque'),
                        ('VIREMENT', 'Virement bancaire'), ('CARTE', 'Carte bancaire'),
                        ('CREDIT', 'À crédit'),
                    ],
                    max_length=50,
                    null=True,
                    verbose_name='Méthode de paiement',
                )),
                ('approved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='expenses_approved',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Approuvé par',
                )),
                ('approval_date', models.DateField(blank=True, null=True, verbose_name="Date d'approbation")),
                ('reference_number', models.CharField(blank=True, max_length=100, null=True, unique=True, verbose_name='Numéro de référence')),
                ('mileage_at_expense', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Kilométrage au moment de la dépense')),
                ('maintenance', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='related_expenses',
                    to='maintenance.maintenance',
                    verbose_name='Maintenance liée',
                )),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Dépense',
                'verbose_name_plural': 'Dépenses',
                'ordering': ['-expense_date'],
            },
        ),
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['vehicle', 'expense_type'], name='expense_vehicle_type_idx'),
        ),
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['expense_date'], name='expense_date_idx'),
        ),
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['is_paid'], name='expense_is_paid_idx'),
        ),
        migrations.CreateModel(
            name='Budget',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('title', models.CharField(max_length=200, verbose_name='Titre du budget')),
                ('description', models.TextField(blank=True, null=True, verbose_name='Description')),
                ('start_date', models.DateField(verbose_name='Date de début')),
                ('end_date', models.DateField(verbose_name='Date de fin')),
                ('fiscal_year', models.IntegerField(verbose_name='Année fiscale')),
                ('total_budget', models.DecimalField(
                    decimal_places=2,
                    max_digits=15,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Budget total (XAF)',
                )),
                ('fuel_budget', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Budget carburant')),
                ('maintenance_budget', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Budget maintenance')),
                ('insurance_budget', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Budget assurance')),
                ('other_budget', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Autres budgets')),
                ('approved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='budgets_approved',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Approuvé par',
                )),
                ('is_approved', models.BooleanField(default=False, verbose_name='Approuvé')),
                ('approval_date', models.DateField(blank=True, null=True, verbose_name="Date d'approbation")),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Budget',
                'verbose_name_plural': 'Budgets',
                'ordering': ['-fiscal_year', '-start_date'],
            },
        ),
        migrations.AddIndex(
            model_name='budget',
            index=models.Index(fields=['fiscal_year'], name='budget_fiscal_year_idx'),
        ),
        migrations.AddIndex(
            model_name='budget',
            index=models.Index(fields=['start_date', 'end_date'], name='budget_dates_idx'),
        ),
    ]
