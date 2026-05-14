from django.urls import path
from rest_framework.routers import SimpleRouter
from .views import DocumentViewSet, verify_document_ai

router = SimpleRouter()
router.register(r'', DocumentViewSet, basename='documents')

urlpatterns = [
    # Vue standalone — doit être déclarée AVANT les urls du router
    # pour ne pas être capturée par le pattern générique du ViewSet
    path('verify-ai/', verify_document_ai, name='documents-verify-ai'),
] + router.urls