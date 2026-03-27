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
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL, verbose_name='Destinataire')),
                ('title', models.CharField(max_length=200, verbose_name='Titre')),
                ('message', models.TextField(verbose_name='Message')),
                ('notification_type', models.CharField(
                    choices=[
                        ('INFO', 'Information'), ('ALERTE', 'Alerte'),
                        ('URGENT', 'Urgent'), ('RAPPEL', 'Rappel'),
                    ],
                    default='INFO',
                    max_length=20,
                    verbose_name='Type',
                )),
                ('status', models.CharField(
                    choices=[
                        ('NON_LU', 'Non lu'), ('LU', 'Lu'), ('ARCHIVE', 'Archivé'),
                    ],
                    default='NON_LU',
                    max_length=20,
                    verbose_name='Statut',
                )),
                ('read_at', models.DateTimeField(blank=True, null=True, verbose_name='Lu le')),
                ('related_object_type', models.CharField(blank=True, help_text='Ex: Vehicle, Reservation, Maintenance', max_length=50, null=True, verbose_name="Type d'objet lié")),
                ('related_object_id', models.IntegerField(blank=True, null=True, verbose_name="ID de l'objet lié")),
                ('action_url', models.CharField(blank=True, help_text="URL vers laquelle rediriger l'utilisateur", max_length=500, null=True, verbose_name="URL d'action")),
            ],
            options={
                'verbose_name': 'Notification',
                'verbose_name_plural': 'Notifications',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'status'], name='notif_recipient_status_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['created_at'], name='notif_created_at_idx'),
        ),
    ]
