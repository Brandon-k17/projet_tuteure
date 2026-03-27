from .models import Vehicle


def get_available_vehicles():
    return Vehicle.objects.filter(status='available')


def update_vehicle_status(vehicle_id: int, status: str) -> Vehicle:
    vehicle = Vehicle.objects.get(pk=vehicle_id)
    vehicle.status = status
    vehicle.save(update_fields=['status', 'updated_at'])
    return vehicle
