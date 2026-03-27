from rest_framework import viewsets
from .models import Maintenance
from .serializers import MaintenanceRecordSerializer


class MaintenanceViewSet(viewsets.ModelViewSet):
    queryset = Maintenance.objects.select_related('vehicle').all()
    serializer_class = MaintenanceRecordSerializer
