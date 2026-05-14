from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.vehicles.models import Vehicle
from .services import create_default_plans

@receiver(post_save, sender=Vehicle)
def auto_plans(sender, instance, created, **kwargs):
    if created:
        create_default_plans(instance)