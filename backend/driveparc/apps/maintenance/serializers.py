from rest_framework import serializers
from .models import Maintenance


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Maintenance
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
