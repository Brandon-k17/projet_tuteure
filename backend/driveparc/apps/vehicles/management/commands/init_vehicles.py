"""
apps/vehicles/management/commands/init_vehicles.py

USAGE :
    python manage.py init_vehicles
    python manage.py init_vehicles --force   # recrée si déjà existants
"""

from django.core.management.base import BaseCommand
from apps.vehicles.models import Vehicle


VEHICLES = [
    # ── TOURISME — Berlines / SUV / Voitures de fonction ──────────────
    {
        "registration_number": "LT 001 CM",
        "internal_code":       "VH-001",
        "make":                "Toyota",
        "model":               "Camry",
        "year":                2022,
        "color":               "Blanc Nacré",
        "vehicle_type":        "BERLINE",
        "category":            "TOURISME",
        "fuel_type":           "ESSENCE",
        "transmission":        "AUTOMATIQUE",
        "seating_capacity":    5,
        "fuel_tank_capacity":  60,
        "current_mileage":     45320,
        "status":              "DISPONIBLE",
        "purchase_price":      18500000,
        "notes":               "Véhicule de fonction Direction",
    },
    {
        "registration_number": "LT 002 CM",
        "internal_code":       "VH-002",
        "make":                "Mercedes-Benz",
        "model":               "C 200",
        "year":                2021,
        "color":               "Noir Métallisé",
        "vehicle_type":        "BERLINE",
        "category":            "TOURISME",
        "fuel_type":           "DIESEL",
        "transmission":        "AUTOMATIQUE",
        "seating_capacity":    5,
        "fuel_tank_capacity":  66,
        "current_mileage":     31200,
        "status":              "DISPONIBLE",
        "purchase_price":      27000000,
        "notes":               "Véhicule de fonction DG",
    },
    {
        "registration_number": "LT 003 CM",
        "internal_code":       "VH-003",
        "make":                "Toyota",
        "model":               "Fortuner",
        "year":                2020,
        "color":               "Gris Argent",
        "vehicle_type":        "SUV",
        "category":            "TOURISME",
        "fuel_type":           "DIESEL",
        "transmission":        "AUTOMATIQUE",
        "seating_capacity":    7,
        "fuel_tank_capacity":  80,
        "current_mileage":     67800,
        "status":              "EN_SERVICE",
        "purchase_price":      22000000,
        "notes":               "Missions terrain",
    },
    {
        "registration_number": "LT 004 CM",
        "internal_code":       "VH-004",
        "make":                "Hyundai",
        "model":               "Tucson",
        "year":                2023,
        "color":               "Bleu Électrique",
        "vehicle_type":        "SUV",
        "category":            "TOURISME",
        "fuel_type":           "ESSENCE",
        "transmission":        "AUTOMATIQUE",
        "seating_capacity":    5,
        "fuel_tank_capacity":  54,
        "current_mileage":     12400,
        "status":              "DISPONIBLE",
        "purchase_price":      19500000,
        "notes":               "Véhicule administratif",
    },
    {
        "registration_number": "LT 005 CM",
        "internal_code":       "VH-005",
        "make":                "Peugeot",
        "model":               "508",
        "year":                2019,
        "color":               "Rouge Carmin",
        "vehicle_type":        "BERLINE",
        "category":            "TOURISME",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    5,
        "fuel_tank_capacity":  65,
        "current_mileage":     98700,
        "status":              "EN_MAINTENANCE",
        "purchase_price":      14000000,
        "notes":               "En révision moteur",
    },

    # ── UTILITAIRE — Minibus / Fourgons ───────────────────────────────
    {
        "registration_number": "LT 006 CM",
        "internal_code":       "VH-006",
        "make":                "Toyota",
        "model":               "HiAce",
        "year":                2021,
        "color":               "Blanc",
        "vehicle_type":        "MINIBUS",
        "category":            "UTILITAIRE",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    15,
        "fuel_tank_capacity":  70,
        "current_mileage":     54300,
        "status":              "DISPONIBLE",
        "purchase_price":      16000000,
        "notes":               "Transport personnel inter-campus",
    },
    {
        "registration_number": "LT 007 CM",
        "internal_code":       "VH-007",
        "make":                "Mercedes-Benz",
        "model":               "Sprinter 316",
        "year":                2020,
        "color":               "Blanc Cassé",
        "vehicle_type":        "MINIBUS",
        "category":            "UTILITAIRE",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    16,
        "fuel_tank_capacity":  95,
        "current_mileage":     87600,
        "status":              "EN_SERVICE",
        "purchase_price":      21000000,
        "notes":               "Livraisons et missions terrain",
    },
    {
        "registration_number": "LT 008 CM",
        "internal_code":       "VH-008",
        "make":                "Renault",
        "model":               "Trafic",
        "year":                2019,
        "color":               "Gris Foncé",
        "vehicle_type":        "FOURGON",
        "category":            "UTILITAIRE",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    9,
        "fuel_tank_capacity":  80,
        "current_mileage":     112000,
        "status":              "DISPONIBLE",
        "purchase_price":      12000000,
        "notes":               "Transport matériel et petit groupe",
    },

    # ── BUS — Transport scolaire ──────────────────────────────────────
    {
        "registration_number": "LT 009 CM",
        "internal_code":       "VH-009",
        "make":                "Yutong",
        "model":               "ZK6729D",
        "year":                2020,
        "color":               "Jaune et Vert IUC",
        "vehicle_type":        "AUTRE",
        "category":            "BUS",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    29,
        "fuel_tank_capacity":  200,
        "current_mileage":     143000,
        "status":              "EN_SERVICE",
        "purchase_price":      35000000,
        "notes":               "Circuit Bonamoussadi — IUC matin/soir",
    },
    {
        "registration_number": "LT 010 CM",
        "internal_code":       "VH-010",
        "make":                "King Long",
        "model":               "XMQ6900",
        "year":                2021,
        "color":               "Jaune et Vert IUC",
        "vehicle_type":        "AUTRE",
        "category":            "BUS",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    35,
        "fuel_tank_capacity":  230,
        "current_mileage":     98200,
        "status":              "DISPONIBLE",
        "purchase_price":      42000000,
        "notes":               "Circuit Deido — Akwa — IUC",
    },
    {
        "registration_number": "LT 011 CM",
        "internal_code":       "VH-011",
        "make":                "Higer",
        "model":               "KLQ6109",
        "year":                2019,
        "color":               "Blanc et Bleu",
        "vehicle_type":        "AUTRE",
        "category":            "BUS",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    45,
        "fuel_tank_capacity":  250,
        "current_mileage":     187450,
        "status":              "EN_MAINTENANCE",
        "purchase_price":      48000000,
        "notes":               "Révision kilométrique dépassée — en atelier",
    },
    {
        "registration_number": "LT 012 CM",
        "internal_code":       "VH-012",
        "make":                "Yutong",
        "model":               "ZK6108",
        "year":                2022,
        "color":               "Jaune et Vert IUC",
        "vehicle_type":        "AUTRE",
        "category":            "BUS",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    49,
        "fuel_tank_capacity":  280,
        "current_mileage":     54700,
        "status":              "DISPONIBLE",
        "purchase_price":      55000000,
        "notes":               "Circuit Logbessou — Makepe — IUC",
    },
    # ── BONUS : Pick-up terrain ───────────────────────────────────────
    {
        "registration_number": "LT 013 CM",
        "internal_code":       "VH-013",
        "make":                "Toyota",
        "model":               "Hilux Double Cab",
        "year":                2021,
        "color":               "Beige Sable",
        "vehicle_type":        "AUTRE",
        "category":            "UTILITAIRE",
        "fuel_type":           "DIESEL",
        "transmission":        "MANUELLE",
        "seating_capacity":    5,
        "fuel_tank_capacity":  80,
        "current_mileage":     43100,
        "status":              "DISPONIBLE",
        "purchase_price":      20000000,
        "notes":               "Missions terrain et transport matériel lourd",
    },
]


class Command(BaseCommand):
    help = "Initialise le parc automobile avec 13 véhicules de démonstration"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Recrée les véhicules s'ils existent déjà"
        )

    def handle(self, *args, **options):
        force = options["force"]
        self.stdout.write(self.style.MIGRATE_HEADING(
            "\n🚗  DrivePARC — Initialisation du parc automobile\n"
        ))

        created = skipped = 0

        for data in VEHICLES:
            reg = data["registration_number"]

            if Vehicle.objects.filter(registration_number=reg).exists():
                if force:
                    Vehicle.objects.filter(registration_number=reg).delete()
                    self.stdout.write(f"  ♻  Recréation de {reg}")
                else:
                    self.stdout.write(f"  ⏭  Déjà existant : {reg}")
                    skipped += 1
                    continue

            v = Vehicle.objects.create(**data)
            self.stdout.write(self.style.SUCCESS(
                f"  ✅  {v.make} {v.model} ({reg}) · {v.category} · {v.seating_capacity} places · {v.status}"
            ))
            created += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"  ✅  {created} véhicule(s) créé(s)"))
        if skipped:
            self.stdout.write(self.style.WARNING(
                f"  ⏭  {skipped} ignoré(s) — utilisez --force pour recréer"
            ))

        self.stdout.write(self.style.MIGRATE_HEADING("\n📋  Récapitulatif :\n"))
        cats = {"TOURISME": 0, "UTILITAIRE": 0, "BUS": 0}
        for d in VEHICLES:
            cats[d["category"]] = cats.get(d["category"], 0) + 1
        for cat, nb in cats.items():
            self.stdout.write(f"  • {cat:<12} : {nb} véhicule(s)")
        self.stdout.write("")