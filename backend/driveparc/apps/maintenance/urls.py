from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import MaintenanceViewSet, BreakdownViewSet

router = SimpleRouter()
router.register(r'maintenance', MaintenanceViewSet, basename='maintenance')
router.register(r'breakdowns', BreakdownViewSet, basename='breakdown')

urlpatterns = [
    path('', include(router.urls)),
]