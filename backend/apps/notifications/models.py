from django.conf import settings
from django.db import models
from apps.core.models import Entity


class Notification(Entity):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    body = models.TextField()
    read = models.BooleanField(default=False)
