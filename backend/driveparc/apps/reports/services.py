from django.db.models import Count, Sum
from apps.vehicles.models import Vehicle
from apps.expenses.models import Expense


def get_fleet_summary() -> dict:
    return {
        'total': Vehicle.objects.count(),
        'by_status': list(Vehicle.objects.values('status').annotate(count=Count('id'))),
    }


def get_expense_report() -> dict:
    return {
        'by_category': list(Expense.objects.values('category').annotate(total=Sum('amount'))),
    }
