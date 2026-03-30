from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Maintenance, Breakdown
from .serializers import MaintenanceSerializer, BreakdownSerializer


class MaintenanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Maintenance.objects.select_related('vehicle').all()
    serializer_class = MaintenanceSerializer


class BreakdownViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Breakdown.objects.select_related('vehicle').all()
    serializer_class = BreakdownSerializer