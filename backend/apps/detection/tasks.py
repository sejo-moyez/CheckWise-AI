from datetime import timedelta
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from apps.credits.services import move
from apps.notifications.tasks import notify
from apps.reports.models import Report
from .models import DetectionJob
from .providers import provider_for, process


@transaction.atomic
def fail_job(job_id, message):
    job = DetectionJob.objects.select_for_update().get(pk=job_id)
    if job.status not in ['queued', 'processing']:
        return
    move(job.owner, job.cost, -job.cost, 'release', f'job:{job.pk}:release')
    job.status, job.error, job.completed_at = 'failed', message, timezone.now()
    job.save(update_fields=['status', 'error', 'completed_at'])
    notify(job.owner, 'Check could not be completed', 'The reserved credits have been returned. Please review the job or contact support.')


@shared_task
def run_job(job_id):
    with transaction.atomic():
        job = DetectionJob.objects.select_for_update().select_related('document', 'owner').get(pk=job_id)
        if job.status != 'queued':
            return
        job.status, job.started_at = 'processing', timezone.now()
        job.save(update_fields=['status', 'started_at'])
    try:
        from .models import Provider
        name = 'mock' if (provider_for(job.kind).__class__.__name__ == 'MockProvider') else 'gateway'
        if Provider.objects.filter(name=name, enabled=False).exists():
            raise ValueError('Provider is disabled by administrator.')
        result = process(provider_for(job.kind), job)
        with transaction.atomic():
            job = DetectionJob.objects.select_for_update().get(pk=job_id)
            if job.status != 'processing':
                return
            move(job.owner, 0, -job.cost, 'consume', f'job:{job.pk}:consume')
            job.status, job.result, job.completed_at = 'completed', result, timezone.now()
            job.provider = result['provider']
            job.save(update_fields=['status', 'result', 'completed_at', 'provider'])
            Report.objects.get_or_create(job=job)
            notify(job.owner, 'Your report is ready', f'Check {job.pk} is complete. Sign in to view the private report.')
            from apps.credits.models import Wallet
            if Wallet.objects.get(user=job.owner).balance < 1:
                notify(job.owner, 'Your credits are running low', 'Your available balance is below 1 credit.')
    except Exception:
        # Never persist exception bodies: providers can echo credentials or document text.
        fail_job(job_id, 'Provider unavailable or processing failed. Credits were released. Contact support with the job ID.')


@shared_task
def recover_jobs():
    now = timezone.now()
    for job in DetectionJob.objects.filter(status='queued', created_at__lt=now - timedelta(minutes=1)):
        run_job.delay(str(job.pk))
    for job in DetectionJob.objects.filter(status='processing', started_at__lt=now - timedelta(minutes=10)):
        fail_job(job.pk, 'Processing timed out. Credits were released.')
