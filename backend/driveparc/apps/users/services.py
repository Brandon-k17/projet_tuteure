"""
Services métier pour l'application users
"""

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import User, DriverProfile, TechnicianProfile


class UserService:
    """
    Service pour la gestion des utilisateurs
    """
    
    @staticmethod
    def create_user_with_profile(user_data, profile_data=None):
        """
        Crée un utilisateur avec son profil associé (chauffeur ou technicien)
        
        Args:
            user_data (dict): Données de l'utilisateur
            profile_data (dict): Données du profil spécifique
        
        Returns:
            User: L'utilisateur créé
        """
        user = User.objects.create_user(**user_data)
        
        if profile_data and user.role == 'CHAUFFEUR':
            DriverProfile.objects.create(user=user, **profile_data)
        elif profile_data and user.role == 'TECHNICIEN':
            TechnicianProfile.objects.create(user=user, **profile_data)
        
        return user
    
    @staticmethod
    def send_welcome_email(user):
        """
        Envoie un email de bienvenue à un nouvel utilisateur
        
        Args:
            user (User): L'utilisateur
        
        Returns:
            bool: True si envoyé avec succès
        """
        subject = 'Bienvenue sur DrivePARC'
        message = f"""
        Bonjour {user.get_full_name()},
        
        Votre compte a été créé avec succès sur la plateforme DrivePARC.
        
        Email: {user.email}
        Rôle: {user.get_role_display()}
        
        Veuillez vous connecter pour accéder à la plateforme.
        
        Cordialement,
        L'équipe DrivePARC
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Erreur d'envoi d'email: {e}")
            return False
    
    @staticmethod
    def send_password_reset_email(user, temp_password):
        """
        Envoie un email de réinitialisation de mot de passe
        
        Args:
            user (User): L'utilisateur
            temp_password (str): Mot de passe temporaire
        
        Returns:
            bool: True si envoyé avec succès
        """
        subject = 'Réinitialisation de votre mot de passe DrivePARC'
        message = f"""
        Bonjour {user.get_full_name()},
        
        Votre mot de passe a été réinitialisé.
        
        Votre mot de passe temporaire est: {temp_password}
        
        Veuillez vous connecter et changer votre mot de passe dès que possible.
        
        Cordialement,
        L'équipe DrivePARC
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Erreur d'envoi d'email: {e}")
            return False
    
    @staticmethod
    def get_users_by_role(role):
        """
        Récupère les utilisateurs par rôle
        
        Args:
            role (str): Le rôle recherché
        
        Returns:
            QuerySet: Liste des utilisateurs
        """
        return User.objects.filter(role=role, is_active=True)
    
    @staticmethod
    def get_active_users_count():
        """
        Compte le nombre d'utilisateurs actifs
        
        Returns:
            int: Nombre d'utilisateurs actifs
        """
        return User.objects.filter(is_active=True).count()
    
    @staticmethod
    def get_users_by_department(department):
        """
        Récupère les utilisateurs d'un département
        
        Args:
            department (str): Le département
        
        Returns:
            QuerySet: Liste des utilisateurs
        """
        return User.objects.filter(
            department__icontains=department,
            is_active=True
        )


class DriverService:
    """
    Service pour la gestion des chauffeurs
    """
    
    @staticmethod
    def get_available_drivers():
        """
        Récupère les chauffeurs disponibles avec permis valide
        
        Returns:
            QuerySet: Liste des chauffeurs disponibles
        """
        today = timezone.now().date()
        return DriverProfile.objects.filter(
            is_available=True,
            is_active=True,
            user__is_active=True,
            license_expiry_date__gt=today
        )
    
    @staticmethod
    def check_license_expiry_alerts():
        """
        Vérifie les permis qui expirent bientôt et retourne les alertes
        
        Returns:
            QuerySet: Chauffeurs dont le permis expire dans 30 jours
        """
        from datetime import timedelta
        today = timezone.now().date()
        warning_date = today + timedelta(days=30)
        
        return DriverProfile.objects.filter(
            license_expiry_date__lte=warning_date,
            license_expiry_date__gt=today,
            is_active=True
        )
    
    @staticmethod
    def get_expired_licenses():
        """
        Récupère les chauffeurs avec permis expiré
        
        Returns:
            QuerySet: Chauffeurs avec permis expiré
        """
        today = timezone.now().date()
        return DriverProfile.objects.filter(
            license_expiry_date__lt=today,
            is_active=True
        )
    
    @staticmethod
    def assign_driver_to_reservation(driver_profile, reservation):
        """
        Assigne un chauffeur à une réservation
        
        Args:
            driver_profile (DriverProfile): Le profil du chauffeur
            reservation: La réservation
        
        Returns:
            bool: True si assigné avec succès
        """
        if not driver_profile.is_available:
            return False
        
        reservation.driver = driver_profile.user
        reservation.save()
        
        # Marquer le chauffeur comme non disponible
        driver_profile.is_available = False
        driver_profile.save()
        
        return True
    
    @staticmethod
    def release_driver(driver_profile):
        """
        Libère un chauffeur (le rend disponible)
        
        Args:
            driver_profile (DriverProfile): Le profil du chauffeur
        """
        driver_profile.is_available = True
        driver_profile.save()


class TechnicianService:
    """
    Service pour la gestion des techniciens
    """
    
    @staticmethod
    def get_available_technicians():
        """
        Récupère les techniciens disponibles
        
        Returns:
            QuerySet: Liste des techniciens disponibles
        """
        return TechnicianProfile.objects.filter(
            is_available=True,
            is_active=True,
            user__is_active=True
        )
    
    @staticmethod
    def get_technicians_by_specialization(specialization):
        """
        Récupère les techniciens par spécialisation
        
        Args:
            specialization (str): La spécialisation recherchée
        
        Returns:
            QuerySet: Liste des techniciens
        """
        return TechnicianProfile.objects.filter(
            specialization__icontains=specialization,
            is_available=True,
            is_active=True
        )
    
    @staticmethod
    def assign_technician_to_maintenance(technician_profile, maintenance):
        """
        Assigne un technicien à une maintenance
        
        Args:
            technician_profile (TechnicianProfile): Le profil du technicien
            maintenance: La maintenance
        
        Returns:
            bool: True si assigné avec succès
        """
        if not technician_profile.is_available:
            return False
        
        maintenance.technician = technician_profile.user
        maintenance.save()
        
        return True
