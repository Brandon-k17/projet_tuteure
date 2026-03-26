from rest_framework import serializers
from .models import MaintenanceRecord


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
