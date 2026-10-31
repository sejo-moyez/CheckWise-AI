from django.conf import settings
from django.db import models
from apps.core.models import Entity


class Ticket(Entity):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=[(x, x) for x in ['open', 'answered', 'closed']], default='open')
    reply = models.TextField(blank=True)
