from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


def get_expiring_documents(days: int = 30):
    from datetime import date, timedelta
    threshold = date.today() + timedelta(days=days)
    return Document.objects.filter(expiry_date__lte=threshold, expiry_date__gte=date.today())
