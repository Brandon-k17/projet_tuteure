from django.core.management.base import BaseCommand
from apps.users.models import Department

DEPARTMENTS = [
    {"school":"3IAC",            "code":"3IAC-GL",   "name":"Génie Logiciel"},
    {"school":"3IAC",            "code":"3IAC-RT",   "name":"Réseaux & Télécommunications"},
    {"school":"3IAC",            "code":"3IAC-MSI",  "name":"Maintenance des Systèmes d'Information"},
      {"school":"3IAC",            "code":"3IAC-3IL",  "name":"3IL Ingenieur"},
        {"school":"3IAC",            "code":"3IAC-TI",  "name":"Technologie de l'informatique"},
          {"school":"3IAC",            "code":"3IAC-CSI",  "name":"Conception des système d'information"},
    {"school":"ISTDI",           "code":"ISTDI-ET",  "name":"Électrotechnique"},
    {"school":"ISTDI",           "code":"ISTDI-FM",  "name":"Fabrication Mécanique"},
    {"school":"ISTDI",           "code":"ISTDI-GC",  "name":"Génie Civil"},
    {"school":"ISTDI",           "code":"ISTDI-FC",  "name":"Froid & Climatisation"},
    {"school":"ICIA",            "code":"ICIA-MK",   "name":"Marketing"},
    {"school":"ICIA",            "code":"ICIA-FIN",  "name":"Finance & Comptabilité"},
    {"school":"ICIA",            "code":"ICIA-GRH",  "name":"Gestion des Ressources Humaines"},
    {"school":"ICIA",            "code":"ICIA-LOG",  "name":"Logistique & Transport"},
    {"school":"SEAS",            "code":"SEAS-CE",   "name":"Civil Engineering"},
    {"school":"SEAS",            "code":"SEAS-EE",   "name":"Electrical Engineering"},
    {"school":"GRADUATE_SCHOOL", "code":"GS-MBA",    "name":"MBA Management"},
    {"school":"GRADUATE_SCHOOL", "code":"GS-FIN",    "name":"Master Finance"},
]

class Command(BaseCommand):
    help = "Initialise les départements IUC"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n🏫  IUC — Initialisation des départements\n"))
        created = skipped = 0
        for d in DEPARTMENTS:
            obj, c = Department.objects.get_or_create(code=d["code"], defaults=d)
            if c:
                self.stdout.write(self.style.SUCCESS(
                    f"  ✅  [{obj.school}] {obj.name} ({obj.code})"
                ))
                created += 1
            else:
                self.stdout.write(f"  ⏭  Déjà existant : {obj.name}")
                skipped += 1
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"  ✅  {created} créé(s), {skipped} ignoré(s)"))