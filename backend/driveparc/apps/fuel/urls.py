from rest_framework.routers import DefaultRouter
from .views import FuelVoucherViewSet

router = DefaultRouter()
router.register(r'', FuelVoucherViewSet, basename='fuel')

urlpatterns = router.urls
