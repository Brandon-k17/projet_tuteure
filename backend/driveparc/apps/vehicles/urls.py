from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    VehicleViewSet,
    VehicleAssignmentViewSet,
    VehicleInsuranceViewSet,
    VehicleDocumentViewSet,
)

router = SimpleRouter()
router.register(r'',            VehicleViewSet,           basename='vehicles')
router.register(r'assignments', VehicleAssignmentViewSet, basename='vehicle-assignments')
router.register(r'insurances',  VehicleInsuranceViewSet,  basename='vehicle-insurances')
router.register(r'documents',   VehicleDocumentViewSet,   basename='vehicle-documents')

urlpatterns = [
    path('', include(router.urls)),
]