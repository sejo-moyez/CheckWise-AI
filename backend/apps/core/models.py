import uuid
from django.conf import settings
from django.db import models


class Entity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class AuditLog(Entity):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=100)
    target = models.CharField(max_length=200)
    detail = models.JSONField(default=dict)


class SiteSetting(models.Model):
    key = models.CharField(max_length=100, primary_key=True)
    value = models.JSONField()
    description = models.CharField(max_length=255, blank=True)
