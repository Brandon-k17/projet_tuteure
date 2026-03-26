# Celery tasks for async notifications
# from celery import shared_task
# from .services import send_notification

# @shared_task
# def send_notification_task(recipient_id, title, message, type='info'):
#     from apps.users.models import User
#     user = User.objects.get(pk=recipient_id)
#     send_notification(user, title, message, type)
