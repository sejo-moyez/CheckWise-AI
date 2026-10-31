import time
from urllib.parse import urlsplit
import requests
from django.conf import settings
from rest_framework.exceptions import ValidationError


LIMITATION = 'AI detection is probabilistic and is not proof of authorship. Similarity requires human review and may include properly cited material.'


class MockProvider:
    name = 'Development mock — no real detection performed'

    def submit_document(self, text, kind, key, mode='natural'):
        return key

    def check_status(self, job_id):
        return 'completed'

    def retrieve_results(self, job_id, text, kind):
        return {'mock': True, 'provider': self.name, 'similarity': None, 'ai_likelihood': None,
                'sources': [], 'sentences': [], 'rewritten_text': text if kind == 'humanize' else None,
                'notes': 'Development fixture only. No similarity or AI score was computed. Rewriting returns the original text unchanged.',
                'limitations': LIMITATION}

    def retrieve_report(self, job_id):
        return None

    def normalize_results(self, result):
        return result


class GatewayProvider:
    """Licensed vendor gateway contract; no implicit vendor or corpus access."""
    name = 'Configured licensed gateway'

    def __init__(self, rewrite=False):
        self.url = settings.REWRITE_API_URL if rewrite else settings.DETECTION_API_URL
        self.key = settings.REWRITE_API_KEY if rewrite else settings.DETECTION_API_KEY
        if not self.url or not self.key or urlsplit(self.url).scheme != 'https':
            raise ValidationError('A licensed HTTPS provider endpoint and API key must be configured.')
        self.url = self.url.rstrip('/')

    def request(self, method, path, **kwargs):
        response = requests.request(method, self.url + path, headers={'Authorization': f'Bearer {self.key}'},
                                    timeout=(5, 25), allow_redirects=False, **kwargs)
        response.raise_for_status()
        if not 200 <= response.status_code < 300:
            raise ValueError('Provider returned an unexpected status.')
        if len(response.content) > 2_000_000:
            raise ValueError('Provider response exceeds limit.')
        return response.json()

    def submit_document(self, text, kind, key, mode='natural'):
        result = self.request('POST', '/jobs', json={'text': text, 'kind': kind, 'mode': mode, 'idempotency_key': key,
            'instructions': 'Preserve meaning, citations, factual claims and technical terminology. Do not invent references.'})
        job_id = str(result['id'])
        if not job_id or len(job_id) > 200 or not all(c.isalnum() or c in '-_' for c in job_id):
            raise ValueError('Invalid provider identifier.')
        return job_id

    def check_status(self, job_id):
        return self.request('GET', f'/jobs/{job_id}')['status']

    def retrieve_results(self, job_id, text, kind):
        return self.normalize_results(self.request('GET', f'/jobs/{job_id}/results'))

    def retrieve_report(self, job_id):
        return None  # Reports are generated locally from normalized, validated results.

    def normalize_results(self, result):
        from .serializers import ResultSerializer
        serializer = ResultSerializer(data=result)
        serializer.is_valid(raise_exception=True)
        return {**serializer.validated_data, 'mock': False, 'provider': self.name, 'limitations': LIMITATION}


def provider_for(kind):
    name = settings.REWRITE_PROVIDER if kind == 'humanize' else settings.DETECTION_PROVIDER
    if name == 'mock':
        if not settings.DEBUG:
            raise ValidationError('Mock providers are forbidden in production.')
        return MockProvider()
    if name != 'gateway':
        raise ValidationError('Unknown provider configuration.')
    return GatewayProvider(rewrite=kind == 'humanize')


def process(provider, job):
    from .models import DetectionJob
    job_id = provider.submit_document(job.document.text, job.kind, str(job.pk), job.mode)
    DetectionJob.objects.filter(pk=job.pk).update(provider_job_id=job_id, provider=provider.name)
    for _ in range(12):
        status = provider.check_status(job_id)
        if status == 'completed':
            result = provider.retrieve_results(job_id, job.document.text, job.kind)
            if job.kind == 'humanize' and not result.get('rewritten_text'):
                raise ValueError('Provider omitted rewritten content.')
            return result
        if status == 'failed':
            raise ValueError('Provider processing failed.')
        time.sleep(2)
    raise TimeoutError('Provider did not finish within the processing window.')
