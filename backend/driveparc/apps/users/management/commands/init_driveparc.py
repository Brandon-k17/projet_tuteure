"""
apps/users/management/commands/init_driveparc.py

Commande Django pour créer les rôles et le premier gestionnaire.

USAGE :
    python manage.py init_driveparc

STRUCTURE :
    Créer le dossier :
    apps/users/management/__init__.py
    apps/users/management/commands/__init__.py
    apps/users/management/commands/init_driveparc.py
"""

from django.core.management.base import BaseCommand
from apps.users.models import User


USERS = [
    # ── Administrateur ──────────────────────────────────────────────────
    {
        "email":      "admin@iuc.univ.cm",
        "first_name": "Super",
        "last_name":  "Admin",
        "role":       "ADMIN",
        "department": "Direction",
        "employee_id": "IUC-ADMIN-001",
        "phone":      "+237 699 000 001",
        "password":   "Admin@DrivePARC2025!",
        "is_staff":   True,
    },
    # ── Gestionnaire de parc ─────────────────────────────────────────────
    {
        "email":      "gestionnaire@iuc.univ.cm",
        "first_name": "Jean",
        "last_name":  "KAMGA",
        "role":       "GESTIONNAIRE",
        "department": "Gestion du parc automobile",
        "employee_id": "IUC-GEST-001",
        "phone":      "+237 699 000 002",
        "password":   "Gestionnaire@2025!",
        "is_staff":   False,
    },
    # ── Chauffeur ────────────────────────────────────────────────────────
    {
        "email":      "chauffeur1@iuc.univ.cm",
        "first_name": "Paul",
        "last_name":  "MBANG",
        "role":       "CHAUFFEUR",
        "department": "Transport",
        "employee_id": "IUC-CHAUF-001",
        "phone":      "+237 699 000 003",
        "password":   "Chauffeur@2025!",
        "is_staff":   False,
    },
    # ── Technicien ───────────────────────────────────────────────────────
    {
        "email":      "technicien1@iuc.univ.cm",
        "first_name": "Marc",
        "last_name":  "NKONO",
        "role":       "TECHNICIEN",
        "department": "Maintenance",
        "employee_id": "IUC-TECH-001",
        "phone":      "+237 699 000 004",
        "password":   "Tech@DrivePARC2025!",
        "is_staff":   False,
    },
    
    {
        "email":      "personnel1@iuc.univ.cm",
        "first_name": "Claire",
        "last_name":  "FOUDA",
        "role":       "PERSONNEL",
        "department": "Secrétariat",
        "employee_id": "IUC-PERS-001",
        "phone":      "+237 699 000 005",
        "password":   "Personnel@2025!",
        "is_staff":   False,
    },
]


class Command(BaseCommand):
    help = "Initialise les utilisateurs DrivePARC (un par rôle)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recrée les utilisateurs s'ils existent déjà",
        )

    def handle(self, *args, **options):
        force = options["force"]
        self.stdout.write(self.style.MIGRATE_HEADING("\n🚗  DrivePARC — Initialisation des utilisateurs\n"))

        created = 0
        skipped = 0

        for data in USERS:
            email    = data["email"]
            password = data.pop("password")
            is_staff = data.pop("is_staff", False)

            if User.objects.filter(email=email).exists():
                if force:
                    User.objects.filter(email=email).delete()
                    self.stdout.write(f"  ♻  Recréation de {email}")
                else:
                    self.stdout.write(f"  ⏭  Déjà existant : {email}")
                    skipped += 1
                    continue

            user = User.objects.create_user(password=password, **data)
            user.is_staff = is_staff
            user.save()

            self.stdout.write(
                self.style.SUCCESS(f"  ✅  Créé : {user.get_full_name()} | {user.role} | {email}")
            )
            created += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"  ✅  {created} utilisateur(s) créé(s)"))
        if skipped:
            self.stdout.write(self.style.WARNING(f"  ⏭  {skipped} ignoré(s) (déjà existants — utilisez --force pour recréer)"))

        self.stdout.write(self.style.MIGRATE_HEADING("\n📋  Récapitulatif des comptes créés :\n"))
        for data in USERS:
            self.stdout.write(f"  • {data['role']:<12}  {data['email']}")

        self.stdout.write(self.style.MIGRATE_HEADING(
            "\n⚠️   IMPORTANT : Changez tous les mots de passe en production !\n"
        ))