"""
Script pour générer tous les fichiers manquants du projet DrivePARC
Exécuter: python generate_files.py
"""

import os

# Créer tous les fichiers __init__.py
init_files = [
    'config/__init__.py',
    'core/__init__.py',
    'apps/__init__.py',
    'apps/users/__init__.py',
    'apps/vehicles/__init__.py',
    'apps/reservations/__init__.py',
    'apps/maintenance/__init__.py',
    'apps/fuel/__init__.py',
    'apps/expenses/__init__.py',
    'apps/notifications/__init__.py',
    'apps/reports/__init__.py',
    'apps/documents/__init__.py',
    'database/__init__.py',
    'database/fixtures/__init__.py',
    'scripts/__init__.py',
    'tests/__init__.py',
]

print("Création des fichiers __init__.py...")
for filepath in init_files:
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        f.write('')
    print(f"✅ {filepath}")

# Créer config/wsgi.py
print("\nCréation de config/wsgi.py...")
with open('config/wsgi.py', 'w') as f:
    f.write('''"""
WSGI config for driveparc project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
''')
print("✅ config/wsgi.py")

# Créer config/asgi.py
print("Création de config/asgi.py...")
with open('config/asgi.py', 'w') as f:
    f.write('''"""
ASGI config for driveparc project.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()
''')
print("✅ config/asgi.py")

print("\n✅ Tous les fichiers de configuration ont été créés avec succès!")
print("\nFichiers restants à créer manuellement:")
print("- Modules vehicles, reservations, maintenance, fuel, expenses")
print("- Modules notifications, reports, documents")
print("- Scripts utilitaires et tests")
print("\nConsultez README.md pour la liste complète.")
