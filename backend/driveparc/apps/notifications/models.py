"""
Modèles pour la gestion des notifications
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel
from core.constants import NOTIFICATION_TYPES, NOTIFICATION_STATUS


class Notification(BaseModel):
    """
    Modèle pour les notifications système
    """
    recipient = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('Destinataire')
    )
    
    # Contenu
    title = models.CharField(
        _('Titre'),
        max_length=200
    )
    message = models.TextField(
        _('Message')
    )
    notification_type = models.CharField(
        _('Type'),
        max_length=20,
        choices=NOTIFICATION_TYPES,
        default='INFO'
    )
    
    # Statut
    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=NOTIFICATION_STATUS,
        default='NON_LU'
    )
    read_at = models.DateTimeField(
        _('Lu le'),
        null=True,
        blank=True
    )
    
    # Lien vers une entité
    related_object_type = models.CharField(
        _('Type d\'objet lié'),
        max_length=50,
        blank=True,
        null=True,
        help_text="Ex: Vehicle, Reservation, Maintenance"
    )
    related_object_id = models.IntegerField(
        _('ID de l\'objet lié'),
        null=True,
        blank=True
    )
    
    # Action
    action_url = models.CharField(
        _('URL d\'action'),
        max_length=500,
        blank=True,
        null=True,
        help_text="URL vers laquelle rediriger l'utilisateur"
    )
    
    class Meta:
        verbose_name = _('Notification')
        verbose_name_plural = _('Notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} → {self.recipient.get_full_name()}"
    
    @property
    def is_read(self):
        """Vérifie si la notification est lue"""
        return self.status == 'LU'
    
    @property
    def is_unread(self):
        """Vérifie si la notification n'est pas lue"""
        return self.status == 'NON_LU'
    
    def mark_as_read(self):
        """Marque la notification comme lue"""
        from django.utils import timezone
        self.status = 'LU'
        self.read_at = timezone.now()
        self.save()
    
    def mark_as_unread(self):
        """Marque la notification comme non lue"""
        self.status = 'NON_LU'
        self.read_at = None
        self.save()
    
    def archive(self):
        """Archive la notification"""
        self.status = 'ARCHIVE'
        self.save()
