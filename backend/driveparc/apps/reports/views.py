from rest_framework.views import APIView
from rest_framework.response import Response
from .services import get_fleet_summary, get_expense_report


class FleetSummaryView(APIView):
    def get(self, request):
        return Response(get_fleet_summary())


class ExpenseReportView(APIView):
    def get(self, request):
        return Response(get_expense_report())
