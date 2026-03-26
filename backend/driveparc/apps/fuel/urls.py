from rest_framework.routers import DefaultRouter
from .views import FuelEntryViewSet

router = DefaultRouter()
router.register(r'', FuelEntryViewSet, basename='fuel')

urlpatterns = router.urls
