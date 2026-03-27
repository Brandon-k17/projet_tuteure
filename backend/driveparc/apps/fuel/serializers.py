from rest_framework import serializers
from .models import FuelVoucher


class FuelVoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelVoucher
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
