"""
Usage: python manage.py shell < scripts/create_admin.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(username='admin', email='admin@driveparc.com', password='admin123', role='admin')
    print("Superuser 'admin' créé.")
else:
    print("L'admin existe déjà.")
