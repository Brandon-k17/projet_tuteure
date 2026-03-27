"""
Tests automatiques pour l'API Authentification & Utilisateurs
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User


class AuthAPITestCase(TestCase):
    """Tests d'authentification JWT"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            email='admin@test.com',
            password='Admin1234!',
            first_name='Admin',
            last_name='Test',
            role='ADMIN',
        )

    def test_login_success(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@test.com',
            'password': 'Admin1234!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('access', response.data['data']['tokens'])
        self.assertIn('refresh', response.data['data']['tokens'])
        self.assertEqual(response.data['data']['user']['email'], 'admin@test.com')

    def test_login_wrong_password(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@test.com',
            'password': 'mauvais'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_unknown_email(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'inconnu@test.com',
            'password': 'Admin1234!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_fields(self):
        response = self.client.post('/api/auth/login/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@test.com',
            'password': 'Admin1234!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['email'], 'admin@test.com')

    def test_profile_unauthenticated(self):
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login = self.client.post('/api/auth/login/', {
            'email': 'admin@test.com',
            'password': 'Admin1234!'
        }, format='json')
        refresh_token = login.data['data']['tokens']['refresh']
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/auth/refresh/', {
            'refresh_token': refresh_token
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data['data'])

    def test_change_password_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/auth/change-password/', {
            'old_password': 'Admin1234!',
            'new_password': 'NewPass5678!',
            'new_password_confirm': 'NewPass5678!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPass5678!'))

    def test_change_password_wrong_old(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/auth/change-password/', {
            'old_password': 'mauvais',
            'new_password': 'NewPass5678!',
            'new_password_confirm': 'NewPass5678!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_mismatch(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/auth/change-password/', {
            'old_password': 'Admin1234!',
            'new_password': 'NewPass5678!',
            'new_password_confirm': 'Different!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserManagementTestCase(TestCase):
    """Tests de gestion des utilisateurs"""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin@test.com', password='Admin1234!',
            first_name='Admin', last_name='Test', role='ADMIN',
        )
        self.driver = User.objects.create_user(
            email='driver@test.com', password='Driver1234!',
            first_name='Jean', last_name='Dupont', role='CHAUFFEUR',
        )

    def test_list_users_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_users_as_driver_forbidden(self):
        self.client.force_authenticate(user=self.driver)
        response = self.client.get('/api/auth/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_user_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/auth/users/', {
            'email': 'nouveau@test.com',
            'password': 'Nouveau1234!',
            'password_confirm': 'Nouveau1234!',
            'first_name': 'Nouveau',
            'last_name': 'User',
            'role': 'GESTIONNAIRE',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='nouveau@test.com').exists())

    def test_create_user_password_mismatch(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/auth/users/', {
            'email': 'test2@test.com',
            'password': 'Pass1234!',
            'password_confirm': 'Different!',
            'first_name': 'Test', 'last_name': 'User', 'role': 'CHAUFFEUR',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soft_delete_user(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/auth/users/{self.driver.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.driver.refresh_from_db()
        self.assertFalse(self.driver.is_active)

    def test_activate_user(self):
        self.driver.is_active = False
        self.driver.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/auth/users/{self.driver.id}/activate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.driver.refresh_from_db()
        self.assertTrue(self.driver.is_active)

    def test_get_roles(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/auth/users/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertGreater(len(response.data['data']), 0)
