# DrivePARC - Système de Gestion de Parc Automobile

## Description
Système complet de gestion de parc automobile développé pour l'Institut Universitaire de la Côte (IUC).

## Architecture du Projet

```
backend/driveparc/
├── manage.py
├── requirements.txt
├── .env
├── .gitignore
├── README.md
│
├── config/                      # Configuration principale
│   ├── __init__.py
│   ├── settings.py             ✅ CRÉÉ
│   ├── urls.py                 ✅ CRÉÉ
│   ├── asgi.py                 ⚠️  À CRÉER
│   └── wsgi.py                 ⚠️  À CRÉER
│
├── core/                        # Logique globale réutilisable
│   ├── __init__.py             ⚠️  À CRÉER
│   ├── models.py               ✅ CRÉÉ
│   ├── permissions.py          ✅ CRÉÉ
│   ├── pagination.py           ✅ CRÉÉ
│   ├── exceptions.py           ✅ CRÉÉ
│   ├── utils.py                ✅ CRÉÉ
│   └── constants.py            ✅ CRÉÉ
│
├── apps/
│   │
│   ├── users/                   # Gestion utilisateurs
│   │   ├── __init__.py         ⚠️  À CRÉER
│   │   ├── models.py           ✅ CRÉÉ
│   │   ├── views.py            ✅ CRÉÉ
│   │   ├── serializers.py      ✅ CRÉÉ
│   │   ├── urls.py             ✅ CRÉÉ
│   │   ├── services.py         ✅ CRÉÉ
│   │   ├── permissions.py      ⚠️  À CRÉER
│   │   └── admin.py            ⚠️  À CRÉER
│   │
│   ├── vehicles/               # Gestion véhicules
│   │   ├── __init__.py         ⚠️  À CRÉER
│   │   ├── models.py           ✅ CRÉÉ
│   │   ├── views.py            ⚠️  À CRÉER
│   │   ├── serializers.py      ✅ CRÉÉ
│   │   ├── urls.py             ⚠️  À CRÉER
│   │   ├── services.py         ⚠️  À CRÉER
│   │   └── admin.py            ⚠️  À CRÉER
│   │
│   ├── reservations/           # Réservations
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── admin.py
│   │
│   ├── maintenance/            # Maintenance & pannes
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── admin.py
│   │
│   ├── fuel/                   # Gestion carburant
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── admin.py
│   │
│   ├── expenses/               # Dépenses
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── admin.py
│   │
│   ├── notifications/          # Notifications
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── tasks.py
│   │   └── urls.py
│   │
│   ├── reports/                # Rapports
│   │   ├── __init__.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── urls.py
│   │   └── utils.py
│   │
│   └── documents/              # Gestion documents
│       ├── __init__.py
│       ├── models.py
│       ├── views.py
│       ├── services.py
│       └── urls.py
│
├── database/                    # Migrations & seeds
│   ├── fixtures/
│   └── seeds.py
│
├── tests/                       # Tests
│   ├── __init__.py
│   ├── test_users.py
│   ├── test_vehicles.py
│   └── test_reservations.py
│
└── scripts/                     # Scripts utilitaires
    ├── create_admin.py
    └── backup_db.py
```

## Fichiers Créés ✅

1. **Configuration de base**
   - requirements.txt
   - .env.example
   - .gitignore
   - config/settings.py
   - config/urls.py

2. **Module Core**
   - core/models.py (BaseModel)
   - core/permissions.py (12+ permissions)
   - core/pagination.py
   - core/exceptions.py
   - core/utils.py (15+ fonctions)
   - core/constants.py (toutes les constantes)

3. **Module Users**
   - apps/users/models.py (User, DriverProfile, TechnicianProfile)
   - apps/users/serializers.py
   - apps/users/views.py (AuthViewSet, UserViewSet, etc.)
   - apps/users/urls.py
   - apps/users/services.py

4. **Module Vehicles**
   - apps/vehicles/models.py (Vehicle, VehicleAssignment, VehicleInsurance, VehicleDocument)
   - apps/vehicles/serializers.py

## Fichiers Restants à Créer ⚠️

### FICHIERS __init__.py
Créer des fichiers __init__.py vides dans:
- config/__init__.py
- core/__init__.py
- apps/__init__.py
- apps/users/__init__.py
- apps/vehicles/__init__.py
- apps/reservations/__init__.py
- apps/maintenance/__init__.py
- apps/fuel/__init__.py
- apps/expenses/__init__.py
- apps/notifications/__init__.py
- apps/reports/__init__.py
- apps/documents/__init__.py

### MODULE VEHICLES (suite)
- apps/vehicles/views.py
- apps/vehicles/urls.py
- apps/vehicles/services.py
- apps/vehicles/admin.py

### MODULE RESERVATIONS (complet)
- apps/reservations/models.py
- apps/reservations/serializers.py
- apps/reservations/views.py
- apps/reservations/urls.py
- apps/reservations/services.py
- apps/reservations/admin.py

### MODULE MAINTENANCE (complet)
- apps/maintenance/models.py
- apps/maintenance/serializers.py
- apps/maintenance/views.py
- apps/maintenance/urls.py
- apps/maintenance/services.py
- apps/maintenance/admin.py

### MODULE FUEL (complet)
- apps/fuel/models.py
- apps/fuel/serializers.py
- apps/fuel/views.py
- apps/fuel/urls.py
- apps/fuel/services.py
- apps/fuel/admin.py

### MODULE EXPENSES (complet)
- apps/expenses/models.py
- apps/expenses/serializers.py
- apps/expenses/views.py
- apps/expenses/urls.py
- apps/expenses/services.py
- apps/expenses/admin.py

### MODULE NOTIFICATIONS (complet)
- apps/notifications/models.py
- apps/notifications/services.py
- apps/notifications/tasks.py
- apps/notifications/urls.py

### MODULE REPORTS (complet)
- apps/reports/views.py
- apps/reports/services.py
- apps/reports/urls.py
- apps/reports/utils.py

### MODULE DOCUMENTS (complet)
- apps/documents/models.py
- apps/documents/views.py
- apps/documents/services.py
- apps/documents/urls.py

### CONFIGURATION DJANGO
- config/asgi.py
- config/wsgi.py

### SCRIPTS
- scripts/create_admin.py
- scripts/backup_db.py

### TESTS
- tests/test_users.py
- tests/test_vehicles.py
- tests/test_reservations.py

## Installation

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres

# Créer la base de données PostgreSQL
createdb driveparc_db

# Appliquer les migrations
python manage.py makemigrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

## Technologies Utilisées

- **Backend**: Django 5.0, Django REST Framework
- **Base de données**: PostgreSQL
- **Authentification**: JWT (djangorestframework-simplejwt)
- **Documentation API**: drf-yasg (Swagger)
- **Gestion des fichiers**: Pillow
- **Génération PDF**: ReportLab, WeasyPrint
- **Analyse de données**: Pandas, NumPy
- **Tâches asynchrones**: Celery, Redis
- **Tests**: pytest, pytest-django

## Fonctionnalités Principales

### Pour l'Administrateur
- Gestion complète des utilisateurs et rôles
- Configuration système
- Gestion des permissions
- Accès à tous les modules

### Pour le Gestionnaire de Parc
- Gestion des véhicules
- Validation des réservations
- Affectation des chauffeurs
- Gestion de la maintenance
- Gestion du carburant
- Suivi des dépenses
- Génération de rapports

### Pour le Personnel
- Création de réservations
- Consultation de l'historique
- Suivi des véhicules affectés

### Pour les Chauffeurs
- Consultation des affectations
- Signalement de pannes
- Mise à jour du kilométrage

### Pour les Techniciens
- Gestion des interventions
- Suivi des pannes
- Historique de maintenance

## API Endpoints

### Authentification
- POST /api/v1/auth/login/
- POST /api/v1/auth/logout/
- POST /api/v1/auth/refresh/
- GET /api/v1/auth/profile/
- PUT /api/v1/auth/profile/update/
- POST /api/v1/auth/change-password/

### Utilisateurs
- GET /api/v1/auth/users/
- POST /api/v1/auth/users/
- GET /api/v1/auth/users/{id}/
- PUT /api/v1/auth/users/{id}/
- DELETE /api/v1/auth/users/{id}/

### Véhicules
- GET /api/v1/vehicles/
- POST /api/v1/vehicles/
- GET /api/v1/vehicles/{id}/
- PUT /api/v1/vehicles/{id}/
- DELETE /api/v1/vehicles/{id}/

### Réservations
- GET /api/v1/reservations/
- POST /api/v1/reservations/
- GET /api/v1/reservations/{id}/
- PUT /api/v1/reservations/{id}/
- POST /api/v1/reservations/{id}/approve/
- POST /api/v1/reservations/{id}/reject/

### Maintenance
- GET /api/v1/maintenance/
- POST /api/v1/maintenance/
- GET /api/v1/maintenance/{id}/
- PUT /api/v1/maintenance/{id}/

### Carburant
- GET /api/v1/fuel/
- POST /api/v1/fuel/
- GET /api/v1/fuel/vouchers/

### Rapports
- GET /api/v1/reports/vehicles-usage/
- GET /api/v1/reports/fuel-consumption/
- GET /api/v1/reports/maintenance-costs/
- GET /api/v1/reports/financial-summary/

## Documentation API

La documentation API Swagger est disponible à:
- http://localhost:8000/api/docs/

La documentation ReDoc est disponible à:
- http://localhost:8000/api/redoc/

## Auteurs

- FOUDJA NZUALA Laetitia
- KENGA GHOMDUM Brandon

## Établissement

Institut Universitaire de la Côte (IUC) - ISTDI
Douala, Cameroun

## Licence

Propriétaire - © 2026 IUC
