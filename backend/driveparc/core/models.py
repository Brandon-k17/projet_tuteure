"""
Modèles de base réutilisables pour toutes les applications
"""

from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    """
    Modèle abstrait de base avec champs de traçabilité
    Tous les modèles du projet héritent de cette classe
    """
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Actif"
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def soft_delete(self):
        """Suppression logique"""
        self.is_active = False
        self.save()

    def restore(self):
        """Restauration après suppression logique"""
        self.is_active = True
        self.save()


class ActiveManager(models.Manager):
    """Manager qui retourne uniquement les objets actifs"""
    
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class AllObjectsManager(models.Manager):
    """Manager qui retourne tous les objets (actifs et inactifs)"""
    
    def get_queryset(self):
        return super().get_queryset()
