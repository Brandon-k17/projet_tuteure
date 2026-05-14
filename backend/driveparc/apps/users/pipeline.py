from rest_framework_simplejwt.tokens import RefreshToken
from apps.users.models import User

def get_or_create_user(backend, details, uid, user=None, *args, **kwargs):
    if user:
        return {'user': user}
    email = details.get('email')
    if not email:
        return None
    try:
        existing = User.objects.get(email=email)
        return {'user': existing, 'is_new': False}
    except User.DoesNotExist:
        return None

def generate_jwt_token(backend, user, response, request, *args, **kwargs):
    from django.shortcuts import redirect
    refresh = RefreshToken.for_user(user)
    access  = str(refresh.access_token)
    refresh_token = str(refresh)
    # Stocke en session ET redirige directement avec les tokens
    request.session['jwt_access']  = access
    request.session['jwt_refresh'] = refresh_token
    # Override la redirection finale
    backend.strategy.session_set(
        'next',
        f'http://localhost:5173/oauth-callback?access={access}&refresh={refresh_token}'
    )