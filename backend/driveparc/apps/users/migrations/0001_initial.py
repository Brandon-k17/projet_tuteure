import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('is_superuser', models.BooleanField(default=False, verbose_name='Superutilisateur')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('email', models.EmailField(max_length=191, unique=True, verbose_name='Adresse email')),
                ('first_name', models.CharField(max_length=100, verbose_name='Prénom')),
                ('last_name', models.CharField(max_length=100, verbose_name='Nom')),
                ('phone', models.CharField(blank=True, max_length=20, null=True, verbose_name='Téléphone')),
                ('role', models.CharField(
                    choices=[
                        ('ADMIN', 'Administrateur'),
                        ('GESTIONNAIRE', 'Gestionnaire de parc'),
                        ('PERSONNEL', 'Personnel (Directeur/Chef département)'),
                        ('CHAUFFEUR', 'Chauffeur'),
                        ('TECHNICIEN', 'Technicien/Mécanicien'),
                    ],
                    default='PERSONNEL',
                    max_length=20,
                    verbose_name='Rôle',
                )),
                ('department', models.CharField(blank=True, help_text="Service ou département d'appartenance", max_length=100, null=True, verbose_name='Département')),
                ('employee_id', models.CharField(blank=True, max_length=50, null=True, unique=True, verbose_name='Matricule')),
                ('profile_picture', models.ImageField(blank=True, null=True, upload_to='profiles/', verbose_name='Photo de profil')),
                ('is_staff', models.BooleanField(default=False, help_text="Désigne si l'utilisateur peut se connecter à l'admin", verbose_name='Membre du staff')),
                ('email_verified', models.BooleanField(default=False, verbose_name='Email vérifié')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='Dernière connexion')),
                ('groups', models.ManyToManyField(
                    blank=True,
                    help_text='The groups this user belongs to.',
                    related_name='user_set',
                    related_query_name='user',
                    to='auth.group',
                    verbose_name='groups',
                )),
                ('user_permissions', models.ManyToManyField(
                    blank=True,
                    help_text='Specific permissions for this user.',
                    related_name='user_set',
                    related_query_name='user',
                    to='auth.permission',
                    verbose_name='user permissions',
                )),
            ],
            options={
                'verbose_name': 'Utilisateur',
                'verbose_name_plural': 'Utilisateurs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='users_email_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['role'], name='users_role_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['employee_id'], name='users_emp_id_idx'),
        ),
        migrations.CreateModel(
            name='DriverProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='driver_profile',
                    to='users.user',
                    verbose_name='Utilisateur',
                )),
                ('license_number', models.CharField(max_length=50, unique=True, verbose_name='Numéro de permis')),
                ('license_category', models.CharField(help_text='Ex: A, B, C, D, E', max_length=10, verbose_name='Catégorie de permis')),
                ('license_issue_date', models.DateField(verbose_name="Date d'obtention du permis")),
                ('license_expiry_date', models.DateField(verbose_name="Date d'expiration du permis")),
                ('years_of_experience', models.IntegerField(default=0, verbose_name="Années d'expérience")),
                ('is_available', models.BooleanField(default=True, verbose_name='Disponible')),
                ('emergency_contact_name', models.CharField(blank=True, max_length=100, null=True, verbose_name="Contact d'urgence - Nom")),
                ('emergency_contact_phone', models.CharField(blank=True, max_length=20, null=True, verbose_name="Contact d'urgence - Téléphone")),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
            ],
            options={
                'verbose_name': 'Profil chauffeur',
                'verbose_name_plural': 'Profils chauffeurs',
                'ordering': ['user__last_name'],
            },
        ),
        migrations.CreateModel(
            name='TechnicianProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='technician_profile',
                    to='users.user',
                    verbose_name='Utilisateur',
                )),
                ('specialization', models.CharField(help_text='Ex: Mécanique, Électricité, Carrosserie', max_length=100, verbose_name='Spécialisation')),
                ('certifications', models.TextField(blank=True, help_text='Liste des certifications professionnelles', null=True, verbose_name='Certifications')),
                ('years_of_experience', models.IntegerField(default=0, verbose_name="Années d'expérience")),
                ('is_available', models.BooleanField(default=True, verbose_name='Disponible')),
            ],
            options={
                'verbose_name': 'Profil technicien',
                'verbose_name_plural': 'Profils techniciens',
                'ordering': ['user__last_name'],
            },
        ),
    ]
