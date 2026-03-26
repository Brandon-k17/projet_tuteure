from django.db.models import Sum
from .models import Expense


def get_expenses_by_vehicle(vehicle_id: int):
    return Expense.objects.filter(vehicle_id=vehicle_id)


def get_total_expenses(vehicle_id: int) -> dict:
    return Expense.objects.filter(vehicle_id=vehicle_id).aggregate(total=Sum('amount'))
