from rest_framework import viewsets
from .models import FuelEntry
from .serializers import FuelEntrySerializer


class FuelEntryViewSet(viewsets.ModelViewSet):
    queryset = FuelEntry.objects.select_related('vehicle', 'driver').all()
    serializer_class = FuelEntrySerializer
