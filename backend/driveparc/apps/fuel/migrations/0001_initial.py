import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('vehicles', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='FuelVoucher',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('code', models.CharField(max_length=50, unique=True, verbose_name='Code du bon')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fuel_vouchers', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('issued_to', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fuel_vouchers_received', to=settings.AUTH_USER_MODEL, verbose_name='Délivré à')),
                ('issued_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fuel_vouchers_issued', to=settings.AUTH_USER_MODEL, verbose_name='Délivré par')),
                ('amount', models.DecimalField(
                    decimal_places=2,
                    max_digits=10,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Montant (XAF)',
                )),
                ('quantity_liters', models.DecimalField(
                    blank=True,
                    decimal_places=2,
                    max_digits=7,
                    null=True,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Quantité (Litres)',
                )),
                ('issue_date', models.DateField(verbose_name="Date d'émission")),
                ('valid_until', models.DateField(verbose_name="Valide jusqu'au")),
                ('used_date', models.DateTimeField(blank=True, null=True, verbose_name="Date d'utilisation")),
                ('status', models.CharField(
                    choices=[
                        ('DISPONIBLE', 'Disponible'), ('UTILISE', 'Utilisé'),
                        ('EXPIRE', 'Expiré'), ('ANNULE', 'Annulé'),
                    ],
                    default='DISPONIBLE',
                    max_length=20,
                    verbose_name='Statut',
                )),
                ('gas_station', models.CharField(blank=True, max_length=200, null=True, verbose_name='Station service')),
                ('month', models.IntegerField(
                    help_text="Mois d'allocation (1-12)",
                    validators=[django.core.validators.MinValueValidator(1)],
                    verbose_name='Mois',
                )),
                ('year', models.IntegerField(verbose_name='Année')),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Bon de carburant',
                'verbose_name_plural': 'Bons de carburant',
                'ordering': ['-issue_date'],
            },
        ),
        migrations.AddIndex(
            model_name='fuelvoucher',
            index=models.Index(fields=['code'], name='fuel_voucher_code_idx'),
        ),
        migrations.AddIndex(
            model_name='fuelvoucher',
            index=models.Index(fields=['vehicle', 'status'], name='fuel_voucher_vehicle_status_idx'),
        ),
        migrations.AddIndex(
            model_name='fuelvoucher',
            index=models.Index(fields=['month', 'year'], name='fuel_voucher_month_year_idx'),
        ),
        migrations.CreateModel(
            name='FuelTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fuel_transactions', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('voucher', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='transactions',
                    to='fuel.fuelvoucher',
                    verbose_name='Bon de carburant',
                )),
                ('driver', models.ForeignKey(
                    limit_choices_to={'role': 'CHAUFFEUR'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='fuel_transactions',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Chauffeur',
                )),
                ('transaction_date', models.DateTimeField(verbose_name='Date de la transaction')),
                ('gas_station', models.CharField(max_length=200, verbose_name='Station service')),
                ('quantity_liters', models.DecimalField(
                    decimal_places=2,
                    max_digits=7,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Quantité (Litres)',
                )),
                ('unit_price', models.DecimalField(
                    decimal_places=2,
                    max_digits=8,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Prix unitaire (XAF/L)',
                )),
                ('total_amount', models.DecimalField(
                    decimal_places=2,
                    max_digits=10,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Montant total (XAF)',
                )),
                ('mileage_at_refuel', models.DecimalField(
                    decimal_places=2,
                    max_digits=10,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Kilométrage lors du plein',
                )),
                ('fuel_type', models.CharField(max_length=50, verbose_name='Type de carburant')),
                ('receipt_number', models.CharField(blank=True, max_length=100, null=True, verbose_name='Numéro de reçu')),
                ('receipt_photo', models.ImageField(blank=True, null=True, upload_to='fuel/receipts/', verbose_name='Photo du reçu')),
                ('payment_method', models.CharField(
                    choices=[
                        ('BON', 'Bon de carburant'), ('ESPECES', 'Espèces'),
                        ('CARTE', 'Carte bancaire'), ('CREDIT', 'À crédit'),
                    ],
                    default='BON',
                    max_length=50,
                    verbose_name='Méthode de paiement',
                )),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Transaction carburant',
                'verbose_name_plural': 'Transactions carburant',
                'ordering': ['-transaction_date'],
            },
        ),
        migrations.AddIndex(
            model_name='fueltransaction',
            index=models.Index(fields=['vehicle', 'transaction_date'], name='fuel_trans_vehicle_date_idx'),
        ),
        migrations.AddIndex(
            model_name='fueltransaction',
            index=models.Index(fields=['driver'], name='fuel_trans_driver_idx'),
        ),
        migrations.AddIndex(
            model_name='fueltransaction',
            index=models.Index(fields=['transaction_date'], name='fuel_trans_date_idx'),
        ),
        migrations.CreateModel(
            name='MonthlyFuelAllocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fuel_allocations', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('month', models.IntegerField(
                    help_text="Mois d'allocation (1-12)",
                    validators=[django.core.validators.MinValueValidator(1)],
                    verbose_name='Mois',
                )),
                ('year', models.IntegerField(verbose_name='Année')),
                ('allocated_amount', models.DecimalField(
                    decimal_places=2,
                    max_digits=10,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Montant alloué (XAF)',
                )),
                ('allocated_liters', models.DecimalField(
                    blank=True,
                    decimal_places=2,
                    max_digits=7,
                    null=True,
                    validators=[django.core.validators.MinValueValidator(0)],
                    verbose_name='Litres alloués',
                )),
                ('used_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Montant utilisé (XAF)')),
                ('used_liters', models.DecimalField(decimal_places=2, default=0, max_digits=7, verbose_name='Litres utilisés')),
                ('approved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='fuel_allocations_approved',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Approuvé par',
                )),
                ('approval_date', models.DateField(blank=True, null=True, verbose_name="Date d'approbation")),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Allocation mensuelle carburant',
                'verbose_name_plural': 'Allocations mensuelles carburant',
                'ordering': ['-year', '-month'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='monthlyfuelallocation',
            unique_together={('vehicle', 'month', 'year')},
        ),
        migrations.AddIndex(
            model_name='monthlyfuelallocation',
            index=models.Index(fields=['vehicle', 'month', 'year'], name='fuel_alloc_vehicle_month_year_idx'),
        ),
    ]
