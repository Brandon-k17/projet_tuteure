from django.test import TestCase
from apps.vehicles.models import Vehicle


class VehicleModelTest(TestCase):
    def test_create_vehicle(self):
        v = Vehicle.objects.create(plate='AA-001-BB', brand='Renault', model='Clio', year=2021)
        self.assertEqual(v.status, 'available')
