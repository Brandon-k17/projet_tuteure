from rest_framework.routers import SimpleRouter
from .views import ExpenseViewSet

router = SimpleRouter()
router.register(r'', ExpenseViewSet, basename='expenses')

urlpatterns = router.urls
