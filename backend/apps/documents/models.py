import uuid
from pathlib import Path
from django.conf import settings
from django.db import models
from apps.core.models import Entity


def private_path(instance, filename):
    return f'documents/{instance.owner_id}/{uuid.uuid4()}{Path(filename).suffix.lower()}'


class Document(Entity):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to=private_path, blank=True)
    text = models.TextField()
    word_count = models.PositiveIntegerField()
    size = models.PositiveIntegerField(default=0)
    format = models.CharField(max_length=10, default='text')
