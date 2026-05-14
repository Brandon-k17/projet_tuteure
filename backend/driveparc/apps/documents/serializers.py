from rest_framework import serializers
from .models import Document
 
 
class DocumentSerializer(serializers.ModelSerializer):
    vehicle_name = serializers.SerializerMethodField()
 
    class Meta:
        model  = Document
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'vehicle_name']
 
    def get_vehicle_name(self, obj):
        v = obj.vehicle
        return f"{v.make} {v.model} — {v.registration_number}"