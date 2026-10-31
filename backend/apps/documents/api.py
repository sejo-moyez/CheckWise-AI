from django.http import FileResponse
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from apps.core.api import VerifiedUser
from apps.detection.models import DetectionJob
from .models import Document
from .services import extract, validate_text


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'title', 'word_count', 'size', 'format', 'created_at']
        read_only_fields = fields


class DocumentInput(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    text = serializers.CharField(max_length=1_000_000, required=False, allow_blank=True)
    file = serializers.FileField(required=False)

    def validate(self, attrs):
        if bool(attrs.get('file')) == bool(attrs.get('text')):
            raise ValidationError('Supply either a file or text.')
        return attrs


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [VerifiedUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return Document.objects.filter(owner=self.request.user)

    def create(self, request):
        data = DocumentInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        upload = values.get('file')
        text, fmt = extract(upload) if upload else (validate_text(values.get('text', '')), 'text')
        doc = Document(owner=request.user, title=values['title'], text=text, word_count=len(text.split()),
                       size=upload.size if upload else len(text.encode()), format=fmt)
        if upload:
            doc.file = upload
        try:
            doc.save()
        except Exception:
            if doc.file:
                doc.file.delete(save=False)
            raise
        return Response(DocumentSerializer(doc).data, status=201)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        import io
        doc = self.get_object()
        stream = doc.file.open('rb') if doc.file else io.BytesIO(doc.text.encode())
        return FileResponse(stream, as_attachment=True, filename=f'document-{doc.id}.{doc.format if doc.file else "txt"}')

    @transaction.atomic
    def perform_destroy(self, instance):
        from apps.reports.models import Report
        # Lock the same document that submission locks; active work cannot race deletion.
        instance = Document.objects.select_for_update().get(pk=instance.pk)
        if DetectionJob.objects.filter(document=instance, status__in=['queued', 'processing']).exists():
            raise ValidationError('Wait for active checks to finish before deleting.')
        files = [r.file for r in Report.objects.filter(job__document=instance) if r.file]
        if instance.file:
            files.append(instance.file)
        instance.delete()
        transaction.on_commit(lambda: [f.delete(save=False) for f in files])
