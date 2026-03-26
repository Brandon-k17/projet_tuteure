"""
Fonctions utilitaires réutilisables
"""

import re
import random
import string
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings


def generate_unique_code(prefix='', length=8):
    """
    Génère un code unique alphanumérique
    
    Args:
        prefix (str): Préfixe optionnel
        length (int): Longueur du code aléatoire
    
    Returns:
        str: Code généré
    """
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
    return f"{prefix}{random_part}" if prefix else random_part


def generate_registration_number(vehicle_type='AUTO'):
    """
    Génère un numéro d'immatriculation pour véhicule
    Format: VEH-YYYY-XXXXX
    
    Args:
        vehicle_type (str): Type de véhicule
    
    Returns:
        str: Numéro d'immatriculation
    """
    year = datetime.now().year
    random_num = ''.join(random.choices(string.digits, k=5))
    prefix = vehicle_type[:3].upper()
    return f"{prefix}-{year}-{random_num}"


def generate_fuel_voucher_code():
    """
    Génère un code unique pour bon de carburant
    Format: BC-YYYYMM-XXXXX
    
    Returns:
        str: Code du bon de carburant
    """
    year_month = datetime.now().strftime('%Y%m')
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"BC-{year_month}-{random_part}"


def calculate_vehicle_availability(vehicle, start_date, end_date):
    """
    Vérifie la disponibilité d'un véhicule sur une période
    
    Args:
        vehicle: Instance du véhicule
        start_date (datetime): Date de début
        end_date (datetime): Date de fin
    
    Returns:
        bool: True si disponible, False sinon
    """
    from apps.reservations.models import Reservation
    from apps.maintenance.models import Maintenance
    
    # Vérifier si véhicule est en maintenance
    active_maintenance = Maintenance.objects.filter(
        vehicle=vehicle,
        status__in=['EN_COURS', 'PLANIFIE'],
        start_date__lte=end_date,
        end_date__gte=start_date
    ).exists()
    
    if active_maintenance:
        return False
    
    # Vérifier les réservations existantes
    conflicting_reservations = Reservation.objects.filter(
        vehicle=vehicle,
        status__in=['APPROUVEE', 'EN_COURS'],
        start_date__lte=end_date,
        end_date__gte=start_date
    ).exists()
    
    return not conflicting_reservations


def send_notification_email(recipient, subject, message):
    """
    Envoie un email de notification
    
    Args:
        recipient (str): Email du destinataire
        subject (str): Sujet de l'email
        message (str): Corps du message
    
    Returns:
        bool: True si envoyé avec succès
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Erreur d'envoi d'email: {e}")
        return False


def validate_cameroon_phone(phone_number):
    """
    Valide un numéro de téléphone camerounais
    
    Args:
        phone_number (str): Numéro à valider
    
    Returns:
        bool: True si valide
    """
    # Format: +237 6XX XX XX XX ou 6XX XX XX XX
    pattern = r'^(\+237)?[26]\d{8}$'
    cleaned_number = re.sub(r'\s+', '', phone_number)
    return bool(re.match(pattern, cleaned_number))


def format_currency(amount, currency='XAF'):
    """
    Formate un montant en devise
    
    Args:
        amount (float): Montant
        currency (str): Code devise
    
    Returns:
        str: Montant formaté
    """
    return f"{amount:,.0f} {currency}".replace(',', ' ')


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calcule la distance entre deux points GPS (formule haversine)
    
    Args:
        lat1, lon1: Coordonnées du point 1
        lat2, lon2: Coordonnées du point 2
    
    Returns:
        float: Distance en kilomètres
    """
    from math import radians, cos, sin, asin, sqrt
    
    # Rayon de la Terre en km
    R = 6371
    
    # Conversion en radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Formule haversine
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c


def get_month_date_range(year, month):
    """
    Retourne la plage de dates pour un mois donné
    
    Args:
        year (int): Année
        month (int): Mois (1-12)
    
    Returns:
        tuple: (start_date, end_date)
    """
    start_date = datetime(year, month, 1)
    
    if month == 12:
        end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    return start_date, end_date


def calculate_business_days(start_date, end_date):
    """
    Calcule le nombre de jours ouvrables entre deux dates
    
    Args:
        start_date (datetime): Date de début
        end_date (datetime): Date de fin
    
    Returns:
        int: Nombre de jours ouvrables
    """
    business_days = 0
    current_date = start_date
    
    while current_date <= end_date:
        # 0 = Lundi, 6 = Dimanche
        if current_date.weekday() < 5:  # Lundi à Vendredi
            business_days += 1
        current_date += timedelta(days=1)
    
    return business_days


def sanitize_filename(filename):
    """
    Nettoie un nom de fichier pour le rendre sûr
    
    Args:
        filename (str): Nom du fichier
    
    Returns:
        str: Nom nettoyé
    """
    # Remplacer les caractères spéciaux
    filename = re.sub(r'[^\w\s.-]', '', filename)
    # Remplacer les espaces multiples
    filename = re.sub(r'\s+', '_', filename)
    return filename.lower()


def get_fiscal_year_dates(year=None):
    """
    Retourne les dates de début et fin de l'année fiscale
    
    Args:
        year (int): Année fiscale (optionnel, défaut = année en cours)
    
    Returns:
        tuple: (start_date, end_date)
    """
    if year is None:
        year = datetime.now().year
    
    start_date = datetime(year, 1, 1)
    end_date = datetime(year, 12, 31, 23, 59, 59)
    
    return start_date, end_date
