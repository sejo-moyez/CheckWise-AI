from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from apps.core.api import VerifiedUser
from apps.credits.services import cost_for, move
from apps.documents.models import Document
from .models import DetectionJob
from .serializers import JobInput, JobSerializer
from .tasks import run_job


class JobViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = JobSerializer
    permission_classes = [VerifiedUser]

    def get_queryset(self):
        return DetectionJob.objects.filter(owner=self.request.user).select_related('document', 'report')

    @action(detail=False, methods=['post'])
    def quote(self, request):
        values = request.data.copy()
        values['request_key'] = '00000000-0000-0000-0000-000000000000'
        serializer = JobInput(data=values)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        doc = get_object_or_404(Document, pk=data['document'], owner=request.user)
        return Response({'credits': str(cost_for(data['kind'], doc.word_count)), 'words': doc.word_count})

    def create(self, request):
        serializer = JobInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            doc = get_object_or_404(Document.objects.select_for_update(), pk=data['document'], owner=request.user)
            job = DetectionJob.objects.filter(owner=request.user, request_key=data['request_key']).first()
            if job:
                if job.document_id != doc.id or job.kind != data['kind'] or job.mode != data['mode']:
                    raise ValidationError('Request key was already used for another check.')
                return Response(JobSerializer(job).data)
            cost = cost_for(data['kind'], doc.word_count)
            job = DetectionJob.objects.create(owner=request.user, document=doc, cost=cost,
                kind=data['kind'], mode=data['mode'], request_key=data['request_key'])
            move(request.user, -cost, cost, 'reserve', f'job:{job.pk}:reserve')
            # Beat recovers committed queued jobs after broker outages.
            transaction.on_commit(lambda: enqueue(str(job.pk)))
        job.refresh_from_db()
        return Response(JobSerializer(job).data, status=201)


def enqueue(job_id):
    try:
        run_job.delay(job_id)
    except Exception:
        pass  # Persisted outbox state is the queued job; recover_jobs retries delivery.
