"""
Tests automatiques pour l'API Véhicules
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.vehicles.models import Vehicle


def make_vehicle(**kwargs):
    """Helper pour créer un véhicule de test"""
    defaults = {
        'registration_number': 'LT-TEST-01',
        'internal_code': 'VEH-TEST-01',
        'make': 'Toyota',
        'model': 'Land Cruiser',
        'year': 2022,
        'color': 'Blanc',
        'vehicle_type': 'SUV',
        'fuel_type': 'DIESEL',
        'transmission': 'AUTOMATIQUE',
        'seating_capacity': 7,
        'fuel_tank_capacity': 87.5,
        'current_mileage': 15000,
        'status': 'DISPONIBLE',
    }
    defaults.update(kwargs)
    return Vehicle.objects.create(**defaults)


class VehicleAPITestCase(TestCase):
    """Tests de l'API véhicules"""

    def setUp(self):
        self.client = APIClient()
        # Créer un admin
        self.admin = User.objects.create_superuser(
            email='admin@test.com',
            password='Admin1234!',
            first_name='Admin',
            last_name='Test',
            role='ADMIN',
        )
        # Créer un utilisateur sans droits de gestion
        self.driver = User.objects.create_user(
            email='driver@test.com',
            password='Driver1234!',
            first_name='Driver',
            last_name='Test',
            role='CHAUFFEUR',
        )
        self.client.force_authenticate(user=self.admin)

    # ------------------------------------------------------------------ #
    # CREATE
    # ------------------------------------------------------------------ #
    def test_create_vehicle_success(self):
        payload = {
            'registration_number': 'LT-001-AA',
            'internal_code': 'VEH-001',
            'make': 'Toyota',
            'model': 'Land Cruiser',
            'year': 2022,
            'color': 'Blanc',
            'vehicle_type': 'SUV',
            'fuel_type': 'DIESEL',
            'transmission': 'AUTOMATIQUE',
            'seating_capacity': 7,
            'fuel_tank_capacity': '87.50',
            'current_mileage': '15000.00',
            'status': 'DISPONIBLE',
        }
        response = self.client.post('/api/vehicles/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['registration_number'], 'LT-001-AA')
        self.assertTrue(Vehicle.objects.filter(registration_number='LT-001-AA').exists())

    def test_create_vehicle_duplicate_registration(self):
        make_vehicle(registration_number='LT-DUP-01', internal_code='VEH-DUP-01')
        payload = {
            'registration_number': 'LT-DUP-01',
            'internal_code': 'VEH-DUP-02',
            'make': 'Peugeot', 'model': '308', 'year': 2021,
            'color': 'Noir', 'vehicle_type': 'BERLINE', 'fuel_type': 'ESSENCE',
            'transmission': 'MANUELLE', 'seating_capacity': 5,
            'fuel_tank_capacity': '50.00',
        }
        response = self.client.post('/api/vehicles/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_vehicle_missing_required_fields(self):
        response = self.client.post('/api/vehicles/', {'make': 'Toyota'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_vehicle_driver_forbidden(self):
        self.client.force_authenticate(user=self.driver)
        payload = {
            'registration_number': 'LT-002-BB',
            'internal_code': 'VEH-002',
            'make': 'Renault', 'model': 'Clio', 'year': 2020,
            'color': 'Rouge', 'vehicle_type': 'BERLINE', 'fuel_type': 'ESSENCE',
            'transmission': 'MANUELLE', 'seating_capacity': 5,
            'fuel_tank_capacity': '45.00',
        }
        response = self.client.post('/api/vehicles/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------ #
    # READ
    # ------------------------------------------------------------------ #
    def test_list_vehicles(self):
        make_vehicle(registration_number='LT-L01', internal_code='VEH-L01')
        make_vehicle(registration_number='LT-L02', internal_code='VEH-L02')
        response = self.client.get('/api/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 2)

    def test_retrieve_vehicle(self):
        v = make_vehicle()
        response = self.client.get(f'/api/vehicles/{v.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['registration_number'], v.registration_number)

    def test_retrieve_vehicle_not_found(self):
        response = self.client.get('/api/vehicles/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_vehicles_filter_by_status(self):
        make_vehicle(registration_number='LT-F01', internal_code='VEH-F01', status='DISPONIBLE')
        make_vehicle(registration_number='LT-F02', internal_code='VEH-F02', status='EN_MAINTENANCE')
        response = self.client.get('/api/vehicles/?status=DISPONIBLE')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for v in response.data['results']:
            self.assertEqual(v['status'], 'DISPONIBLE')

    def test_list_vehicles_search(self):
        make_vehicle(registration_number='LT-S01', internal_code='VEH-S01', make='Mercedes')
        response = self.client.get('/api/vehicles/?search=Mercedes')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)

    # ------------------------------------------------------------------ #
    # UPDATE
    # ------------------------------------------------------------------ #
    def test_update_vehicle(self):
        v = make_vehicle()
        response = self.client.patch(f'/api/vehicles/{v.id}/', {'color': 'Noir'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        v.refresh_from_db()
        self.assertEqual(v.color, 'Noir')

    def test_update_vehicle_driver_forbidden(self):
        self.client.force_authenticate(user=self.driver)
        v = make_vehicle()
        response = self.client.patch(f'/api/vehicles/{v.id}/', {'color': 'Bleu'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------ #
    # DELETE (soft)
    # ------------------------------------------------------------------ #
    def test_soft_delete_vehicle(self):
        v = make_vehicle()
        response = self.client.delete(f'/api/vehicles/{v.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        v.refresh_from_db()
        self.assertFalse(v.is_active)

    # ------------------------------------------------------------------ #
    # ACTIONS CUSTOM
    # ------------------------------------------------------------------ #
    def test_change_status_valid(self):
        v = make_vehicle()
        response = self.client.post(
            f'/api/vehicles/{v.id}/change_status/',
            {'status': 'EN_SERVICE'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        v.refresh_from_db()
        self.assertEqual(v.status, 'EN_SERVICE')

    def test_change_status_invalid(self):
        v = make_vehicle()
        response = self.client.post(
            f'/api/vehicles/{v.id}/change_status/',
            {'status': 'STATUT_INEXISTANT'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_update_mileage_success(self):
        v = make_vehicle(current_mileage=10000)
        response = self.client.post(
            f'/api/vehicles/{v.id}/update_mileage/',
            {'mileage': 12000},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        v.refresh_from_db()
        self.assertEqual(float(v.current_mileage), 12000)

    def test_update_mileage_lower_than_current(self):
        v = make_vehicle(current_mileage=10000)
        response = self.client.post(
            f'/api/vehicles/{v.id}/update_mileage/',
            {'mileage': 5000},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_mileage_missing_field(self):
        v = make_vehicle()
        response = self.client.post(f'/api/vehicles/{v.id}/update_mileage/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_available_vehicles(self):
        make_vehicle(registration_number='LT-AV1', internal_code='VEH-AV1', status='DISPONIBLE')
        make_vehicle(registration_number='LT-AV2', internal_code='VEH-AV2', status='EN_SERVICE')
        response = self.client.get('/api/vehicles/available/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        for v in response.data['data']:
            self.assertEqual(v['status'], 'DISPONIBLE')

    def test_stats(self):
        make_vehicle(registration_number='LT-ST1', internal_code='VEH-ST1', status='DISPONIBLE')
        make_vehicle(registration_number='LT-ST2', internal_code='VEH-ST2', status='EN_MAINTENANCE')
        response = self.client.get('/api/vehicles/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data['data'])
        self.assertIn('by_status', response.data['data'])
        self.assertIn('by_type', response.data['data'])

    # ------------------------------------------------------------------ #
    # UNAUTHENTICATED
    # ------------------------------------------------------------------ #
    def test_unauthenticated_access(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
