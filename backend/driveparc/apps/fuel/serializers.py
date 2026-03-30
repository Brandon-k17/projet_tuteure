from rest_framework import serializers
from .models import FuelVoucher, FuelTransaction, MonthlyFuelAllocation


class FuelVoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelVoucher
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class FuelTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelTransaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_amount']


class MonthlyFuelAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyFuelAllocation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']