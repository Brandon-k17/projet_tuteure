"""
Script pour vider les tables Django existantes et repartir proprement.
Usage (depuis backend/driveparc/): venv\Scripts\python.exe manage.py shell < scripts/reset_db.py
"""
from django.db import connection

tables_to_drop = [
    'django_admin_log',
    'auth_group_permissions',
    'auth_permission',
    'auth_group',
    'django_content_type',
    'django_session',
    'django_migrations',
]

with connection.cursor() as c:
    c.execute('SET FOREIGN_KEY_CHECKS = 0')
    for t in tables_to_drop:
        c.execute(f'DROP TABLE IF EXISTS `{t}`')
        print(f'Dropped: {t}')
    c.execute('SET FOREIGN_KEY_CHECKS = 1')

print('Base nettoyée. Lance maintenant: venv\\Scripts\\python.exe manage.py migrate')
