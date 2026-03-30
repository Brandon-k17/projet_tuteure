from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Document.objects.select_related('vehicle').all()
    serializer_class = DocumentSerializer