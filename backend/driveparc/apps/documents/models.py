from django.db import models
from core.models import BaseModel
from apps.vehicles.models import Vehicle
 
 
class Document(BaseModel):
    TYPE_CHOICES = [
        ('insurance',    'Assurance'),
        ('registration', 'Carte grise'),
        ('inspection',   'Visite technique'),
        ('vignette',     'Vignette automobile'),
        ('other',        'Autre'),
    ]
    vehicle     = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='vehicle_documents')
    type        = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title       = models.CharField(max_length=200)
    file        = models.FileField(upload_to='documents/%Y/%m/', null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    montant     = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    notes       = models.TextField(blank=True, default='')
 
    class Meta:
        db_table = 'documents'
        ordering = ['expiry_date']
 
    def __str__(self):
        return f"{self.get_type_display()} — {self.vehicle.registration_number}"

 