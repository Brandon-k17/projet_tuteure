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
            name='Reservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservations', to='vehicles.vehicle', verbose_name='Véhicule')),
                ('requester', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservations_made', to=settings.AUTH_USER_MODEL, verbose_name='Demandeur')),
                ('driver', models.ForeignKey(
                    blank=True,
                    limit_choices_to={'role': 'CHAUFFEUR'},
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='driving_assignments',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Chauffeur assigné',
                )),
                ('start_date', models.DateTimeField(verbose_name='Date et heure de début')),
                ('end_date', models.DateTimeField(verbose_name='Date et heure de fin')),
                ('actual_start_date', models.DateTimeField(blank=True, null=True, verbose_name='Date de début effective')),
                ('actual_end_date', models.DateTimeField(blank=True, null=True, verbose_name='Date de fin effective')),
                ('purpose', models.TextField(verbose_name='Objectif de la réservation')),
                ('destination', models.CharField(max_length=200, verbose_name='Destination')),
                ('number_of_passengers', models.IntegerField(default=1, verbose_name='Nombre de passagers')),
                ('estimated_distance', models.DecimalField(blank=True, decimal_places=2, max_digits=7, null=True, verbose_name='Distance estimée (km)')),
                ('status', models.CharField(
                    choices=[
                        ('EN_ATTENTE', 'En attente'), ('APPROUVEE', 'Approuvée'),
                        ('REJETEE', 'Rejetée'), ('EN_COURS', 'En cours'),
                        ('TERMINEE', 'Terminée'), ('ANNULEE', 'Annulée'),
                    ],
                    default='EN_ATTENTE',
                    max_length=20,
                    verbose_name='Statut',
                )),
                ('priority', models.CharField(
                    choices=[
                        ('BASSE', 'Basse'), ('NORMALE', 'Normale'),
                        ('HAUTE', 'Haute'), ('URGENTE', 'Urgente'),
                    ],
                    default='NORMALE',
                    max_length=20,
                    verbose_name='Priorité',
                )),
                ('approved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reservations_approved',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Approuvé par',
                )),
                ('approval_date', models.DateTimeField(blank=True, null=True, verbose_name="Date d'approbation")),
                ('rejection_reason', models.TextField(blank=True, null=True, verbose_name='Raison du rejet')),
                ('start_mileage', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Kilométrage de départ')),
                ('end_mileage', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name="Kilométrage d'arrivée")),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
                ('cancellation_reason', models.TextField(blank=True, null=True, verbose_name="Raison de l'annulation")),
            ],
            options={
                'verbose_name': 'Réservation',
                'verbose_name_plural': 'Réservations',
                'ordering': ['-start_date'],
            },
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['status'], name='reservations_status_idx'),
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['start_date', 'end_date'], name='reservations_dates_idx'),
        ),
        migrations.AddIndex(
            model_name='reservation',
            index=models.Index(fields=['vehicle', 'status'], name='reservations_vehicle_status_idx'),
        ),
    ]
