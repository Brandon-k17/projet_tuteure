# apps/reservations/pointages_urls.py
from rest_framework.routers import SimpleRouter
from .views import PointageViewSet

router = SimpleRouter()
router.register(r'', PointageViewSet, basename='pointage')

urlpatterns = router.urls