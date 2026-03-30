from rest_framework import serializers
from .models import Maintenance, Breakdown


class MaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Maintenance
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class BreakdownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Breakdown
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']