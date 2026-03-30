from django.db import models
from core.models import BaseModel
from apps.vehicles.models import Vehicle


class Document(BaseModel):
    TYPE_CHOICES = [
        ('insurance', 'Assurance'),
        ('registration', 'Carte grise'),
        ('inspection', 'Contrôle technique'),
        ('other', 'Autre'),
    ]
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='vehicle_documents')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='documents/%Y/%m/')
    expiry_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'documents'