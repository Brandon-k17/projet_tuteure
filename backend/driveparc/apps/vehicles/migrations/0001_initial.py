import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Vehicle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('registration_number', models.CharField(max_length=50, unique=True, verbose_name="Numéro d'immatriculation")),
                ('internal_code', models.CharField(help_text="Code d'identification interne du véhicule", max_length=50, unique=True, verbose_name='Code interne')),
                ('make', models.CharField(max_length=100, verbose_name='Marque')),
                ('model', models.CharField(max_length=100, verbose_name='Modèle')),
                ('year', models.IntegerField(verbose_name='Année de fabrication')),
                ('color', models.CharField(max_length=50, verbose_name='Couleur')),
                ('vehicle_type', models.CharField(
                    choices=[
                        ('BERLINE', 'Berline'), ('SUV', 'SUV'), ('MINIBUS', 'Minibus'),
                        ('CAMION', 'Camion'), ('MOTO', 'Moto'), ('UTILITAIRE', 'Utilitaire'),
                    ],
                    max_length=20,
                    verbose_name='Type de véhicule',
                )),
                ('fuel_type', models.CharField(
                    choices=[
                        ('ESSENCE', 'Essence'), ('DIESEL', 'Diesel'),
                        ('ELECTRIQUE', 'Électrique'), ('HYBRIDE', 'Hybride'),
                    ],
                    max_length=20,
                    verbose_name='Type de carburant',
                )),
                ('transmission', models.CharField(
                    choices=[('MANUELLE', 'Manuelle'), ('AUTOMATIQUE', 'Automatique')],
                    default='MANUELLE',
                    max_length=20,
                    verbose_name='Transmission',
                )),
                ('seating_capacity', models.IntegerField(default=5, verbose_name='Nombre de places')),
                ('fuel_tank_capacity', models.DecimalField(decimal_places=2, help_text='Capacité du réservoir en litres', max_digits=6, verbose_name='Capacité du réservoir (L)')),
                ('current_mileage', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Kilométrage actuel')),
                ('average_fuel_consumption', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, verbose_name='Consommation moyenne (L/100km)')),
                ('status', models.CharField(
                    choices=[
                        ('DISPONIBLE', 'Disponible'), ('EN_SERVICE', 'En service'),
                        ('EN_MAINTENANCE', 'En maintenance'), ('HORS_SERVICE', 'Hors service'),
                        ('RESERVE', 'Réservé'),
                    ],
                    default='DISPONIBLE',
                    max_length=20,
                    verbose_name='Statut',
                )),
                ('purchase_date', models.DateField(blank=True, null=True, verbose_name="Date d'achat")),
                ('registration_date', models.DateField(blank=True, null=True, verbose_name="Date d'immatriculation")),
                ('last_maintenance_date', models.DateField(blank=True, null=True, verbose_name='Date de dernière maintenance')),
                ('next_maintenance_date', models.DateField(blank=True, null=True, verbose_name='Date de prochaine maintenance')),
                ('purchase_price', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name="Prix d'achat")),
                ('current_value', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name='Valeur actuelle')),
                ('gps_enabled', models.BooleanField(default=False, verbose_name='GPS activé')),
                ('last_known_latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True, verbose_name='Dernière latitude connue')),
                ('last_known_longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True, verbose_name='Dernière longitude connue')),
                ('last_gps_update', models.DateTimeField(blank=True, null=True, verbose_name='Dernière mise à jour GPS')),
                ('vin_number', models.CharField(blank=True, max_length=17, null=True, unique=True, verbose_name='Numéro de châssis (VIN)')),
                ('engine_number', models.CharField(blank=True, max_length=50, null=True, verbose_name='Numéro de moteur')),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
                ('photo', models.ImageField(blank=True, null=True, upload_to='vehicles/', verbose_name='Photo')),
            ],
            options={
                'verbose_name': 'Véhicule',
                'verbose_name_plural': 'Véhicules',
                'ordering': ['registration_number'],
            },
        ),
        migrations.AddIndex(
            model_name='vehicle',
            index=models.Index(fields=['registration_number'], name='vehicles_vehicle_reg_idx'),
        ),
        migrations.AddIndex(
            model_name='vehicle',
            index=models.Index(fields=['internal_code'], name='vehicles_vehicle_code_idx'),
        ),
        migrations.AddIndex(
            model_name='vehicle',
            index=models.Index(fields=['status'], name='vehicles_vehicle_status_idx'),
        ),
        migrations.AddIndex(
            model_name='vehicle',
            index=models.Index(fields=['vehicle_type'], name='vehicles_vehicle_type_idx'),
        ),
        migrations.CreateModel(
            name='VehicleAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vehicle_assignments', to=settings.AUTH_USER_MODEL, verbose_name='Utilisateur')),
                ('start_date', models.DateField(verbose_name='Date de début')),
                ('end_date', models.DateField(blank=True, help_text='Laisser vide pour une affectation permanente', null=True, verbose_name='Date de fin')),
                ('is_permanent', models.BooleanField(default=False, verbose_name='Affectation permanente')),
                ('purpose', models.TextField(blank=True, null=True, verbose_name="Objectif de l'affectation")),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Affectation de véhicule',
                'verbose_name_plural': 'Affectations de véhicules',
                'ordering': ['-start_date'],
            },
        ),
        migrations.CreateModel(
            name='VehicleInsurance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='insurances', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('insurance_company', models.CharField(max_length=200, verbose_name="Compagnie d'assurance")),
                ('policy_number', models.CharField(max_length=100, unique=True, verbose_name='Numéro de police')),
                ('coverage_type', models.CharField(help_text='Ex: Tous risques, Tiers complet, etc.', max_length=100, verbose_name='Type de couverture')),
                ('start_date', models.DateField(verbose_name='Date de début')),
                ('end_date', models.DateField(verbose_name='Date de fin')),
                ('annual_premium', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Prime annuelle')),
                ('document', models.FileField(blank=True, null=True, upload_to='insurances/', verbose_name="Document d'assurance")),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Assurance véhicule',
                'verbose_name_plural': 'Assurances véhicules',
                'ordering': ['-end_date'],
            },
        ),
        migrations.CreateModel(
            name='VehicleDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vehicle_documents', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('document_type', models.CharField(
                    choices=[
                        ('CARTE_GRISE', 'Carte grise'), ('VISITE_TECHNIQUE', 'Visite technique'),
                        ('ASSURANCE', 'Assurance'), ('CONTRAT_ACHAT', "Contrat d'achat"), ('AUTRES', 'Autres'),
                    ],
                    max_length=50,
                    verbose_name='Type de document',
                )),
                ('document_name', models.CharField(max_length=200, verbose_name='Nom du document')),
                ('document_file', models.FileField(upload_to='vehicle_documents/', verbose_name='Fichier')),
                ('issue_date', models.DateField(blank=True, null=True, verbose_name="Date d'émission")),
                ('expiry_date', models.DateField(blank=True, null=True, verbose_name="Date d'expiration")),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Document véhicule',
                'verbose_name_plural': 'Documents véhicules',
                'ordering': ['-created_at'],
            },
        ),
    ]
