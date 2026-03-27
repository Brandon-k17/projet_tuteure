"""
Script de seed pour peupler la base de données avec des données de test.
Usage: python manage.py shell < database/seeds.py
"""
from apps.users.models import User
from apps.vehicles.models import Vehicle


def seed_users():
    User.objects.create_superuser(username='admin', email='admin@driveparc.com', password='admin123', role='admin')
    print("Admin créé.")


def seed_vehicles():
    vehicles = [
        {'plate': 'AA-001-BB', 'brand': 'Renault', 'model': 'Clio', 'year': 2021, 'fuel_type': 'essence'},
        {'plate': 'CC-002-DD', 'brand': 'Peugeot', 'model': '308', 'year': 2022, 'fuel_type': 'diesel'},
    ]
    for v in vehicles:
        Vehicle.objects.get_or_create(plate=v['plate'], defaults=v)
    print(f"{len(vehicles)} véhicules créés.")


if __name__ == '__main__':
    seed_users()
    seed_vehicles()
