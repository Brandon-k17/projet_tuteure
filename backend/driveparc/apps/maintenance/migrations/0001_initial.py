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
            name='Maintenance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='maintenances', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('maintenance_type', models.CharField(
                    choices=[
                        ('PREVENTIVE', 'Préventive'), ('CORRECTIVE', 'Corrective'), ('PERIODIQUE', 'Périodique'),
                    ],
                    max_length=20,
                    verbose_name='Type de maintenance',
                )),
                ('status', models.CharField(
                    choices=[
                        ('PLANIFIE', 'Planifié'), ('EN_COURS', 'En cours'),
                        ('TERMINE', 'Terminé'), ('ANNULE', 'Annulé'),
                    ],
                    default='PLANIFIE',
                    max_length=20,
                    verbose_name='Statut',
                )),
                ('scheduled_date', models.DateField(verbose_name='Date prévue')),
                ('start_date', models.DateTimeField(blank=True, null=True, verbose_name='Date de début')),
                ('end_date', models.DateTimeField(blank=True, null=True, verbose_name='Date de fin')),
                ('technician', models.ForeignKey(
                    blank=True,
                    limit_choices_to={'role': 'TECHNICIEN'},
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='maintenances_performed',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Technicien',
                )),
                ('description', models.TextField(verbose_name='Description des travaux')),
                ('parts_replaced', models.TextField(blank=True, null=True, verbose_name='Pièces remplacées')),
                ('work_performed', models.TextField(blank=True, null=True, verbose_name='Travaux effectués')),
                ('mileage_at_maintenance', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Kilométrage lors de la maintenance')),
                ('next_maintenance_mileage', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Kilométrage de la prochaine maintenance')),
                ('labor_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name="Coût de la main d'œuvre")),
                ('parts_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Coût des pièces')),
                ('total_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Coût total')),
                ('invoice_document', models.FileField(blank=True, null=True, upload_to='maintenance/invoices/', verbose_name='Facture')),
                ('report_document', models.FileField(blank=True, null=True, upload_to='maintenance/reports/', verbose_name='Rapport de maintenance')),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Maintenance',
                'verbose_name_plural': 'Maintenances',
                'ordering': ['-scheduled_date'],
            },
        ),
        migrations.AddIndex(
            model_name='maintenance',
            index=models.Index(fields=['vehicle', 'status'], name='maintenance_vehicle_status_idx'),
        ),
        migrations.AddIndex(
            model_name='maintenance',
            index=models.Index(fields=['scheduled_date'], name='maintenance_scheduled_date_idx'),
        ),
        migrations.AddIndex(
            model_name='maintenance',
            index=models.Index(fields=['maintenance_type'], name='maintenance_type_idx'),
        ),
        migrations.CreateModel(
            name='Breakdown',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='breakdowns', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('reported_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='breakdowns_reported', to=settings.AUTH_USER_MODEL, verbose_name='Signalé par')),
                ('assigned_technician', models.ForeignKey(
                    blank=True,
                    limit_choices_to={'role': 'TECHNICIEN'},
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='breakdowns_assigned',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Technicien assigné',
                )),
                ('title', models.CharField(max_length=200, verbose_name='Titre de la panne')),
                ('description', models.TextField(verbose_name='Description détaillée')),
                ('location', models.CharField(help_text="Lieu où la panne s'est produite", max_length=200, verbose_name='Localisation')),
                ('reported_date', models.DateTimeField(auto_now_add=True, verbose_name='Date de signalement')),
                ('resolved_date', models.DateTimeField(blank=True, null=True, verbose_name='Date de résolution')),
                ('severity', models.CharField(
                    choices=[
                        ('FAIBLE', 'Faible'), ('MOYENNE', 'Moyenne'),
                        ('ELEVEE', 'Élevée'), ('CRITIQUE', 'Critique'),
                    ],
                    default='MOYENNE',
                    max_length=20,
                    verbose_name='Gravité',
                )),
                ('status', models.CharField(
                    choices=[
                        ('SIGNALE', 'Signalé'), ('EN_DIAGNOSTIC', 'En diagnostic'),
                        ('EN_REPARATION', 'En réparation'), ('REPARE', 'Réparé'),
                        ('NON_REPARABLE', 'Non réparable'),
                    ],
                    default='SIGNALE',
                    max_length=20,
                    verbose_name='Statut',
                )),
                ('mileage_at_breakdown', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Kilométrage au moment de la panne')),
                ('diagnosis', models.TextField(blank=True, null=True, verbose_name='Diagnostic')),
                ('repair_actions', models.TextField(blank=True, null=True, verbose_name='Actions de réparation')),
                ('parts_used', models.TextField(blank=True, null=True, verbose_name='Pièces utilisées')),
                ('repair_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10, verbose_name='Coût de la réparation')),
                ('maintenance', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='related_breakdowns',
                    to='maintenance.maintenance',
                    verbose_name='Maintenance associée',
                )),
                ('photo', models.ImageField(blank=True, null=True, upload_to='breakdowns/photos/', verbose_name='Photo de la panne')),
                ('report_document', models.FileField(blank=True, null=True, upload_to='breakdowns/reports/', verbose_name='Rapport de réparation')),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Panne',
                'verbose_name_plural': 'Pannes',
                'ordering': ['-reported_date'],
            },
        ),
        migrations.AddIndex(
            model_name='breakdown',
            index=models.Index(fields=['vehicle', 'status'], name='breakdown_vehicle_status_idx'),
        ),
        migrations.AddIndex(
            model_name='breakdown',
            index=models.Index(fields=['severity'], name='breakdown_severity_idx'),
        ),
        migrations.AddIndex(
            model_name='breakdown',
            index=models.Index(fields=['reported_date'], name='breakdown_reported_date_idx'),
        ),
    ]
