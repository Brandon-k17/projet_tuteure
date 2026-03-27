from rest_framework import serializers
from .models import FuelEntry


class FuelEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelEntry
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
