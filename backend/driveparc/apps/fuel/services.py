from django.db.models import Sum
from .models import FuelEntry


def get_total_fuel_cost(vehicle_id: int) -> dict:
    return FuelEntry.objects.filter(vehicle_id=vehicle_id).aggregate(
        total=Sum('total_cost'),
        liters=Sum('liters'),
    )
