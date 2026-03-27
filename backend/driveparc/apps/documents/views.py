from rest_framework import viewsets
from .models import Document
from .services import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related('vehicle').all()
    serializer_class = DocumentSerializer
