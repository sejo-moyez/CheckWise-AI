from rest_framework import serializers
from .models import DetectionJob


class SourceSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500)
    url = serializers.URLField(max_length=2000)
    passage = serializers.CharField(max_length=10000, required=False, allow_blank=True)

    def validate_url(self, value):
        from urllib.parse import urlsplit
        if urlsplit(value).scheme not in ['http', 'https']:
            raise serializers.ValidationError('Source links must use HTTP or HTTPS.')
        return value


class SentenceSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=10000)
    ai_likelihood = serializers.FloatField(min_value=0, max_value=100, allow_null=True)


class ResultSerializer(serializers.Serializer):
    similarity = serializers.FloatField(min_value=0, max_value=100, required=False, allow_null=True, default=None)
    ai_likelihood = serializers.FloatField(min_value=0, max_value=100, required=False, allow_null=True, default=None)
    human_likelihood = serializers.FloatField(min_value=0, max_value=100, required=False, allow_null=True)
    sources = SourceSerializer(many=True, max_length=100, required=False, default=list)
    sentences = SentenceSerializer(many=True, max_length=5000, required=False, default=list)
    rewritten_text = serializers.CharField(max_length=1_000_000, required=False, allow_null=True)
    notes = serializers.CharField(max_length=10000, required=False, allow_blank=True)

    def validate(self, attrs):
        import math
        for key in ['similarity', 'ai_likelihood', 'human_likelihood']:
            if attrs.get(key) is not None and not math.isfinite(attrs[key]):
                raise serializers.ValidationError('Provider scores must be finite percentages.')
        for sentence in attrs.get('sentences', []):
            if sentence['ai_likelihood'] is not None and not math.isfinite(sentence['ai_likelihood']):
                raise serializers.ValidationError('Sentence scores must be finite percentages.')
        return attrs


class JobInput(serializers.Serializer):
    document = serializers.UUIDField()
    kind = serializers.ChoiceField(choices=['combined', 'plagiarism', 'ai', 'humanize'])
    mode = serializers.ChoiceField(choices=['natural', 'academic', 'professional', 'simple', 'formal', 'conversational'], default='natural')
    request_key = serializers.UUIDField()


class JobSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='document.title', read_only=True)
    report_id = serializers.SerializerMethodField()
    original_text = serializers.SerializerMethodField()

    def get_report_id(self, obj) -> str | None:
        return str(obj.report.id) if hasattr(obj, 'report') else None

    def get_original_text(self, obj) -> str | None:
        return obj.document.text if obj.kind == 'humanize' else None

    class Meta:
        model = DetectionJob
        fields = ['id', 'document', 'title', 'kind', 'mode', 'status', 'cost', 'provider', 'result',
                  'error', 'report_id', 'original_text', 'created_at', 'completed_at']
        read_only_fields = fields
