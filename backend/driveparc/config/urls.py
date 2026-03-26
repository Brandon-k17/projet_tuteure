"""
Configuration des URLs pour le projet DrivePARC
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Configuration Swagger/OpenAPI
schema_view = get_schema_view(
    openapi.Info(
        title="DrivePARC API",
        default_version='v1',
        description="API de gestion de parc automobile pour l'IUC",
        terms_of_service="https://www.example.com/terms/",
        contact=openapi.Contact(email="contact@driveparc.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # API Endpoints
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/vehicles/', include('apps.vehicles.urls')),
    path('api/v1/reservations/', include('apps.reservations.urls')),
    path('api/v1/maintenance/', include('apps.maintenance.urls')),
    path('api/v1/fuel/', include('apps.fuel.urls')),
    path('api/v1/expenses/', include('apps.expenses.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/documents/', include('apps.documents.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Debug toolbar
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

# Personnalisation de l'admin
admin.site.site_header = "Administration DrivePARC"
admin.site.site_title = "DrivePARC Admin"
admin.site.index_title = "Gestion du parc automobile"
