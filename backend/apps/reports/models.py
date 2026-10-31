from django.db import models
from apps.core.models import Entity
from apps.detection.models import DetectionJob


class Report(Entity):
    job = models.OneToOneField(DetectionJob, on_delete=models.CASCADE)
    file = models.FileField(upload_to='reports/', blank=True)
