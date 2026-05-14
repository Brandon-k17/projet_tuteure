"""
Constantes globales du système DrivePARC
"""

# Rôles utilisateurs
USER_ROLES = (
    ('ADMIN', 'Administrateur'),
    ('GESTIONNAIRE', 'Gestionnaire de parc'),
    ('PERSONNEL', 'Personnel (Directeur/Chef département)'),
    ('CHAUFFEUR', 'Chauffeur'),
    ('TECHNICIEN', 'Technicien/Mécanicien'),
)

# Types de véhicules
VEHICLE_TYPES = (
    ('BERLINE', 'Berline'),
    ('SUV', 'SUV'),
    ('MINIBUS', 'Minibus'),
    ('CAMION', 'Camion'),
    ('MOTO', 'Moto'),
    ('UTILITAIRE', 'Utilitaire'),
)

# Statuts des véhicules
VEHICLE_STATUS = (
    ('DISPONIBLE', 'Disponible'),
    ('EN_SERVICE', 'En service'),
    ('EN_MAINTENANCE', 'En maintenance'),
    ('HORS_SERVICE', 'Hors service'),
    ('RESERVE', 'Réservé'),
)

# Types de carburant
FUEL_TYPES = (
    ('ESSENCE', 'Essence'),
    ('DIESEL', 'Diesel'),
    ('ELECTRIQUE', 'Électrique'),
    ('HYBRIDE', 'Hybride'),
)

# Types de transmission
TRANSMISSION_TYPES = (
    ('MANUELLE', 'Manuelle'),
    ('AUTOMATIQUE', 'Automatique'),
)

# Statuts des réservations
RESERVATION_STATUS = (
    ('EN_ATTENTE', 'En attente'),
    ('APPROUVEE', 'Approuvée'),
    ('REJETEE', 'Rejetée'),
    ('EN_COURS', 'En cours'),
    ('TERMINEE', 'Terminée'),
    ('ANNULEE', 'Annulée'),
)

# Priorités des réservations
RESERVATION_PRIORITIES = (
    ('BASSE', 'Basse'),
    ('NORMALE', 'Normale'),
    ('HAUTE', 'Haute'),
    ('URGENTE', 'Urgente'),
)

# Types de maintenance
MAINTENANCE_TYPES = (
    ('PREVENTIVE', 'Préventive'),
    ('CORRECTIVE', 'Corrective'),
    ('PERIODIQUE', 'Périodique'),
)

# Statuts de maintenance
MAINTENANCE_STATUS = (
    ('PLANIFIE', 'Planifié'),
    ('EN_COURS', 'En cours'),
    ('TERMINE', 'Terminé'),
    ('ANNULE', 'Annulé'),
)

# Niveaux de gravité des pannes
BREAKDOWN_SEVERITY = (
    ('FAIBLE', 'Faible'),
    ('MOYENNE', 'Moyenne'),
    ('ELEVEE', 'Élevée'),
    ('CRITIQUE', 'Critique'),
)

# Statuts des pannes
BREAKDOWN_STATUS = (
    ('SIGNALE', 'Signalé'),
    ('EN_DIAGNOSTIC', 'En diagnostic'),
    ('EN_REPARATION', 'En réparation'),
    ('TRANSFERE_MAINT','Transféré en maintenance'),
    ('REPARE', 'Réparé'),
    ('NON_REPARABLE', 'Non réparable'),
    
)

# Types de dépenses
EXPENSE_TYPES = (
    ('CARBURANT', 'Carburant'),
    ('MAINTENANCE', 'Maintenance'),
    ('REPARATION', 'Réparation'),
    ('ASSURANCE', 'Assurance'),
    ('TAXES', 'Taxes'),
    ('PIECES', 'Pièces détachées'),
    ('AUTRES', 'Autres'),
)

# Statuts des bons de carburant
FUEL_VOUCHER_STATUS = (
    ('DISPONIBLE', 'Disponible'),
    ('UTILISE', 'Utilisé'),
    ('EXPIRE', 'Expiré'),
    ('ANNULE', 'Annulé'),
)

# Types de notifications
NOTIFICATION_TYPES = (
    ('INFO', 'Information'),
    ('ALERTE', 'Alerte'),
    ('URGENT', 'Urgent'),
    ('RAPPEL', 'Rappel'),
)

# Statuts des notifications
NOTIFICATION_STATUS = (
    ('NON_LU', 'Non lu'),
    ('LU', 'Lu'),
    ('ARCHIVE', 'Archivé'),
)

# Types de documents
DOCUMENT_TYPES = (
    ('CARTE_GRISE', 'Carte grise'),
    ('ASSURANCE', 'Assurance'),
    ('VISITE_TECHNIQUE', 'Visite technique'),
    ('FACTURE', 'Facture'),
    ('BON_COMMANDE', 'Bon de commande'),
    ('RAPPORT', 'Rapport'),
    ('PHOTO', 'Photo'),
    ('AUTRES', 'Autres'),
)

# Fréquences de maintenance
MAINTENANCE_FREQUENCIES = (
    ('QUOTIDIEN', 'Quotidien'),
    ('HEBDOMADAIRE', 'Hebdomadaire'),
    ('MENSUEL', 'Mensuel'),
    ('TRIMESTRIEL', 'Trimestriel'),
    ('SEMESTRIEL', 'Semestriel'),
    ('ANNUEL', 'Annuel'),
)

# Périodes de rapport
REPORT_PERIODS = (
    ('DAILY', 'Quotidien'),
    ('WEEKLY', 'Hebdomadaire'),
    ('MONTHLY', 'Mensuel'),
    ('QUARTERLY', 'Trimestriel'),
    ('YEARLY', 'Annuel'),
    ('CUSTOM', 'Personnalisé'),
)

# Types de rapports
REPORT_TYPES = (
    ('VEHICLE_USAGE', 'Utilisation des véhicules'),
    ('FUEL_CONSUMPTION', 'Consommation carburant'),
    ('MAINTENANCE_COST', 'Coûts de maintenance'),
    ('BREAKDOWN_ANALYSIS', 'Analyse des pannes'),
    ('RESERVATION_STATS', 'Statistiques réservations'),
    ('FINANCIAL_SUMMARY', 'Résumé financier'),
)

# Limites et seuils
MAX_RESERVATION_DAYS = 30  # Durée maximale d'une réservation
MAX_ADVANCE_BOOKING_DAYS = 90  # Nombre de jours à l'avance pour réserver
MIN_BOOKING_NOTICE_HOURS = 24  # Préavis minimum pour une réservation
FUEL_ALERT_THRESHOLD = 20  # Seuil d'alerte pour le niveau de carburant (%)
MAINTENANCE_REMINDER_DAYS = 7  # Rappel de maintenance X jours avant
DOCUMENT_EXPIRY_ALERT_DAYS = 30  # Alerte d'expiration de document X jours avant

# Formats de fichiers autorisés
ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif']
ALLOWED_DOCUMENT_FORMATS = ['pdf', 'doc', 'docx', 'xls', 'xlsx']
MAX_FILE_SIZE_MB = 10  # Taille maximale des fichiers en MB

# Codes d'erreur métier
ERROR_CODES = {
    'VEHICLE_NOT_AVAILABLE': 'VEH001',
    'RESERVATION_CONFLICT': 'RES001',
    'INVALID_DATE_RANGE': 'DATE001',
    'INSUFFICIENT_FUEL': 'FUEL001',
    'MAINTENANCE_REQUIRED': 'MAIN001',
    'PERMISSION_DENIED': 'PERM001',
    'DOCUMENT_EXPIRED': 'DOC001',
}

# Messages de notification prédéfinis
NOTIFICATION_MESSAGES = {
    'RESERVATION_APPROVED': 'Votre réservation a été approuvée',
    'RESERVATION_REJECTED': 'Votre réservation a été rejetée',
    'MAINTENANCE_REMINDER': 'Rappel: Maintenance prévue pour le véhicule {vehicle}',
    'FUEL_LOW': 'Alerte: Niveau de carburant faible pour {vehicle}',
    'DOCUMENT_EXPIRING': 'Document {document_type} expire bientôt pour {vehicle}',
    'BREAKDOWN_REPORTED': 'Panne signalée sur le véhicule {vehicle}',
}

# Configuration email
EMAIL_SUBJECTS = {
    'RESERVATION_NOTIFICATION': 'DrivePARC - Notification de réservation',
    'MAINTENANCE_ALERT': 'DrivePARC - Alerte de maintenance',
    'PASSWORD_RESET': 'DrivePARC - Réinitialisation de mot de passe',
    'ACCOUNT_CREATED': 'DrivePARC - Bienvenue sur la plateforme',
}
