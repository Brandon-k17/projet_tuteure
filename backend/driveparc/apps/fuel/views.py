from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import FuelVoucher, FuelTransaction, MonthlyFuelAllocation
from .serializers import FuelVoucherSerializer, FuelTransactionSerializer, MonthlyFuelAllocationSerializer


class FuelVoucherViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = FuelVoucher.objects.select_related('vehicle', 'issued_to', 'issued_by').all()
    serializer_class = FuelVoucherSerializer


class FuelTransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = FuelTransaction.objects.select_related('vehicle', 'driver', 'voucher').all()
    serializer_class = FuelTransactionSerializer


class MonthlyFuelAllocationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = MonthlyFuelAllocation.objects.select_related('vehicle', 'approved_by').all()
    serializer_class = MonthlyFuelAllocationSerializer