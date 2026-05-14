from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    VehicleViewSet,
    VehicleAssignmentViewSet,
    VehicleInsuranceViewSet,
    VehicleDocumentViewSet,
    BusRouteViewSet,
)

router = SimpleRouter()

# ← bus-routes AVANT le registre vide, sinon r'' capture tout
router.register(r'bus-routes',  BusRouteViewSet,          basename='bus-routes')
router.register(r'assignments', VehicleAssignmentViewSet, basename='vehicle-assignments')
router.register(r'insurances',  VehicleInsuranceViewSet,  basename='vehicle-insurances')
router.register(r'documents',   VehicleDocumentViewSet,   basename='vehicle-documents')
router.register(r'',            VehicleViewSet,           basename='vehicles')  # ← toujours en dernier

urlpatterns = [
    path('', include(router.urls)),
]