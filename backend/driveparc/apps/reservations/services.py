from .models import Reservation


def approve_reservation(reservation_id: int) -> Reservation:
    r = Reservation.objects.get(pk=reservation_id)
    r.status = 'approved'
    r.save(update_fields=['status', 'updated_at'])
    return r


def cancel_reservation(reservation_id: int) -> Reservation:
    r = Reservation.objects.get(pk=reservation_id)
    r.status = 'cancelled'
    r.save(update_fields=['status', 'updated_at'])
    return r
