from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from .models import Notification


@shared_task(autoretry_for=(OSError,), retry_backoff=True, max_retries=3)
def email_message(email, subject, body):
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email])


def notify(user, title, body):
    from django.db import transaction
    Notification.objects.create(owner=user, title=title, body=body)
    transaction.on_commit(lambda: email_message.delay(user.email, title, body))
