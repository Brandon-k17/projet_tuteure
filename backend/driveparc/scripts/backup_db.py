"""
Script de sauvegarde de la base de données SQLite.
Usage: python scripts/backup_db.py
"""
import shutil
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db.sqlite3')
BACKUP_DIR = os.path.join(os.path.dirname(__file__), '..', 'database', 'backups')

os.makedirs(BACKUP_DIR, exist_ok=True)

timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_path = os.path.join(BACKUP_DIR, f'db_backup_{timestamp}.sqlite3')

shutil.copy2(DB_PATH, backup_path)
print(f"Backup créé : {backup_path}")
