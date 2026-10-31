from datetime import timedelta
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from .models import Document
from .api import DocumentViewSet


@shared_task
def purge_expired():
    cutoff = timezone.now() - timedelta(days=settings.RETENTION_DAYS)
    for doc in Document.objects.filter(created_at__lt=cutoff).exclude(detectionjob__status__in=['queued', 'processing']).distinct():
        DocumentViewSet().perform_destroy(doc)
