from .models import MaintenanceRecord


def get_pending_maintenance():
    return MaintenanceRecord.objects.filter(resolved=False)


def resolve_maintenance(record_id: int) -> MaintenanceRecord:
    record = MaintenanceRecord.objects.get(pk=record_id)
    record.resolved = True
    record.save(update_fields=['resolved', 'updated_at'])
    return record
