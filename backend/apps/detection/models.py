from django.conf import settings
from django.db import models
from apps.core.models import Entity
from apps.documents.models import Document


class Provider(models.Model):
    name = models.CharField(max_length=100, primary_key=True)
    enabled = models.BooleanField(default=True)
    description = models.TextField(blank=True)


class DetectionJob(Entity):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    kind = models.CharField(max_length=20)
    mode = models.CharField(max_length=30, default='natural')
    status = models.CharField(max_length=20, default='queued', db_index=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    provider = models.CharField(max_length=100, blank=True)
    provider_job_id = models.CharField(max_length=200, blank=True)
    result = models.JSONField(default=dict)
    error = models.CharField(max_length=255, blank=True)
    request_key = models.UUIDField()
    started_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)

    class Meta(Entity.Meta):
        constraints = [models.UniqueConstraint(fields=['owner', 'request_key'], name='job_request_unique')]
