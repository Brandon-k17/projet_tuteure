"""
URLs pour l'application users
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import AuthViewSet, UserViewSet, DriverProfileViewSet, TechnicianProfileViewSet, DepartmentViewSet,StaffRegistryViewSet

router = SimpleRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'drivers', DriverProfileViewSet, basename='driver')
router.register(r'technicians', TechnicianProfileViewSet, basename='technician')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'registry',    StaffRegistryViewSet, basename='registry')

urlpatterns = [
    # Authentification
    path('login/', AuthViewSet.as_view({'post': 'login'}), name='login'),
    path('logout/', AuthViewSet.as_view({'post': 'logout'}), name='logout'),
    path('refresh/', AuthViewSet.as_view({'post': 'refresh'}), name='token_refresh'),
    path('profile/', AuthViewSet.as_view({'get': 'profile'}), name='profile'),
    path('profile/update/', AuthViewSet.as_view({'put': 'update_profile', 'patch': 'update_profile'}), name='update_profile'),
    path('change-password/', AuthViewSet.as_view({'post': 'change_password'}), name='change_password'),
    
    # Autres routes
    path('', include(router.urls)),
]
