import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('vehicles', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Date de création')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Date de modification')),
                ('is_active', models.BooleanField(default=True, verbose_name='Actif')),
                ('vehicle', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='doc_documents', to='vehicles.vehicle')),
                ('type', models.CharField(
                    choices=[
                        ('insurance', 'Assurance'), ('registration', 'Carte grise'),
                        ('inspection', 'Contrôle technique'), ('other', 'Autre'),
                    ],
                    max_length=20,
                )),
                ('title', models.CharField(max_length=200)),
                ('file', models.FileField(upload_to='documents/%Y/%m/')),
                ('expiry_date', models.DateField(blank=True, null=True)),
            ],
            options={
                'db_table': 'documents',
            },
        ),
    ]
