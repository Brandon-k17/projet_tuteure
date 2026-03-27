from rest_framework import viewsets
from .models import FuelVoucher
from .serializers import FuelVoucherSerializer


class FuelVoucherViewSet(viewsets.ModelViewSet):
    queryset = FuelVoucher.objects.select_related('vehicle', 'driver').all()
    serializer_class = FuelVoucherSerializer
