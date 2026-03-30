from django.urls import path
from .views import FleetSummaryView, ExpenseReportView

urlpatterns = [
    path('fleet-summary/', FleetSummaryView.as_view(), name='fleet-summary'),
    path('expense-report/', ExpenseReportView.as_view(), name='expense-report'),
]