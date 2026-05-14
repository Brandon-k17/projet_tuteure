"""
apps/fuel/urls.py
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import FuelCardViewSet, FuelTransactionViewSet, MonthlyFuelAllocationViewSet

router = SimpleRouter()
router.register(r'cards',        FuelCardViewSet,               basename='fuel-card')
router.register(r'transactions', FuelTransactionViewSet,        basename='fuel-transaction')
router.register(r'allocations',  MonthlyFuelAllocationViewSet,  basename='fuel-allocation')

urlpatterns = [
    path('', include(router.urls)),
]

# Endpoints générés :
# GET/POST   /api/v1/fuel/cards/
# GET        /api/v1/fuel/cards/my-card/        ← chauffeur
# GET        /api/v1/fuel/cards/dashboard/      ← gestionnaire
# POST       /api/v1/fuel/cards/{id}/recharge/  ← gestionnaire
#
# GET/POST   /api/v1/fuel/transactions/
# GET        /api/v1/fuel/transactions/stats/
# POST       /api/v1/fuel/transactions/{id}/valider/
#
# GET/POST   /api/v1/fuel/allocations/
# POST       /api/v1/fuel/allocations/bulk-create/