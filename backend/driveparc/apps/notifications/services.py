from .models import Notification
from apps.users.models import User


def send_notification(recipient: User, title: str, message: str, type: str = 'info') -> Notification:
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        type=type,
    )


def mark_as_read(notification_id: int) -> Notification:
    n = Notification.objects.get(pk=notification_id)
    n.read = True
    n.save(update_fields=['read'])
    return n
