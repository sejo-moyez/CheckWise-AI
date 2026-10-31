import secrets
import time
import uuid
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.credits.models import Wallet
from apps.detection.models import DetectionJob
from apps.payments.models import CreditPackage


class Command(BaseCommand):
    help = 'Run an actual queued mock workflow (development only); retains labeled test records.'

    def handle(self, *args, **options):
        if not settings.DEBUG or settings.PAYMENT_PROVIDER != 'mock' or settings.DETECTION_PROVIDER != 'mock':
            raise CommandError('Smoke is allowed only with DEBUG and mock payment/detection providers.')
        user = User.objects.create_user(f'smoke-{uuid.uuid4().hex[:12]}@example.invalid', secrets.token_urlsafe(32), email_verified=True)
        client = APIClient(); client.force_authenticate(user)
        package = CreditPackage.objects.filter(active=True, subscription_days=0).order_by('price_kes').first()
        def check(response, code):
            if response.status_code != code:
                raise CommandError(f'Smoke endpoint failed: HTTP {response.status_code}')
            return response.data
        payment = check(client.post('/api/v1/payments/', {'package': str(package.pk), 'phone': '0712345678'}, format='json'), 201)
        check(client.post(f'/api/v1/payments/{payment["id"]}/mock-confirm/'), 200)
        doc = check(client.post('/api/v1/documents/', {'title': 'Development queue smoke test', 'text': 'Original research text for a labeled development workflow test.'}, format='json'), 201)
        job = check(client.post('/api/v1/detection/', {'document': doc['id'], 'kind': 'combined', 'request_key': str(uuid.uuid4())}, format='json'), 201)
        for _ in range(90):
            value = DetectionJob.objects.get(pk=job['id'])
            if value.status in ['completed', 'failed']:
                break
            time.sleep(.5)
        if value.status != 'completed' or not value.result.get('mock'):
            raise CommandError('Worker did not complete the mock job.')
        report = client.get(f'/api/v1/reports/{value.report.pk}/download/')
        if report.status_code != 200 or not b''.join(report.streaming_content).startswith(b'%PDF'):
            raise CommandError('Report did not produce a PDF.')
        wallet = Wallet.objects.get(user=user)
        if wallet.balance != package.credits - 1 or wallet.reserved != 0:
            raise CommandError('Wallet did not settle correctly.')
        self.stdout.write(self.style.SUCCESS('PASS: mock purchase → private document → queued worker → settled credits → authorized PDF.'))
