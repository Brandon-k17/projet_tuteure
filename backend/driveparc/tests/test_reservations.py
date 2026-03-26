from django.test import TestCase
from apps.reservations.models import Reservation


class ReservationModelTest(TestCase):
    def test_reservation_default_status(self):
        # Placeholder - requires fixtures for user and vehicle
        self.assertEqual(Reservation._meta.get_field('status').default, 'pending')
