from rest_framework.routers import DefaultRouter
from .views import MaintenanceRecordViewSet

router = DefaultRouter()
router.register(r'', MaintenanceRecordViewSet, basename='maintenance')

urlpatterns = router.urls
