from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import FuelVoucherViewSet, FuelTransactionViewSet, MonthlyFuelAllocationViewSet

router = SimpleRouter()
router.register(r'vouchers', FuelVoucherViewSet, basename='fuel-voucher')
router.register(r'transactions', FuelTransactionViewSet, basename='fuel-transaction')
router.register(r'allocations', MonthlyFuelAllocationViewSet, basename='fuel-allocation')

urlpatterns = [
    path('', include(router.urls)),
]