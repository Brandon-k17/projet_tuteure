"""
Crée un utilisateur admin de test.
Usage: venv\Scripts\python.exe manage.py shell < scripts/create_test_user.py
"""
from apps.users.models import User

email = 'admin@driveparc.com'

if User.objects.filter(email=email).exists():
    print(f"Utilisateur {email} existe déjà.")
else:
    user = User.objects.create_superuser(
        email=email,
        password='Admin1234!',
        first_name='Admin',
        last_name='DrivePARC',
        role='ADMIN',
    )
    print(f"Utilisateur créé: {user.email} / Admin1234!")
