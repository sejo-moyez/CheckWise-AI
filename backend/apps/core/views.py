from decimal import Decimal, InvalidOperation
from datetime import timedelta
from django.conf import settings
from django.db import connection, transaction
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from apps.accounts.models import User
from apps.core.models import AuditLog
from apps.credits.models import Wallet, LedgerEntry, ServicePrice
from apps.credits.services import move, transfer
from apps.documents.models import Document
from apps.detection.models import DetectionJob
from apps.reports.models import Report
from apps.reports.services import render_pdf
from apps.payments.models import CreditPackage, Payment
from apps.payments.api import PackageSerializer
from apps.subscriptions.models import Subscription
from apps.referrals.models import ReferralReward
from apps.notifications.models import Notification
from apps.support.models import Ticket
from .api import VerifiedUser


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([AllowAny])
def configuration(request):
    return Response({'brand': settings.BRAND_NAME, 'development': settings.DEBUG,
        'detection_mock': settings.DETECTION_PROVIDER == 'mock', 'rewrite_mock': settings.REWRITE_PROVIDER == 'mock',
        'payment_provider': settings.PAYMENT_PROVIDER, 'max_upload_mb': 20,
        'max_words': settings.MAX_DOCUMENT_WORDS, 'retention_days': settings.RETENTION_DAYS,
        'prices': list(ServicePrice.objects.values()),
        'packages': PackageSerializer(CreditPackage.objects.filter(active=True).order_by('price_kes'), many=True).data})


@api_view(['GET'])
def dashboard(request):
    jobs = DetectionJob.objects.filter(owner=request.user)
    wallet, _ = Wallet.objects.get_or_create(user=request.user)
    usage = list(jobs.filter(status='completed', completed_at__gte=timezone.now()-timedelta(days=14))
                 .annotate(day=TruncDate('completed_at')).values('day').annotate(checks=Count('id')).order_by('day'))
    return Response({'balance': str(wallet.balance), 'reserved': str(wallet.reserved),
        'documents': Document.objects.filter(owner=request.user).count(),
        'completed': jobs.filter(status='completed').count(), 'pending': jobs.filter(status__in=['queued','processing']).count(),
        'usage': usage, 'unread_notifications': Notification.objects.filter(owner=request.user, read=False).count()})


@api_view(['GET'])
def wallet(request):
    value, _ = Wallet.objects.get_or_create(user=request.user)
    return Response({'balance': str(value.balance), 'reserved': str(value.reserved)})


class LedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ['id', 'amount', 'reserved_delta', 'balance_after', 'kind', 'reference', 'note', 'created_at']


class LedgerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LedgerSerializer
    def get_queryset(self):
        return LedgerEntry.objects.filter(user=self.request.user)


class ReportSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='job.document.title')
    kind = serializers.CharField(source='job.kind')
    job_id = serializers.UUIDField(source='job.id')
    mock = serializers.SerializerMethodField()
    def get_mock(self, report) -> bool:
        return report.job.result.get('mock', False)
    class Meta:
        model = Report
        fields = ['id', 'job_id', 'title', 'kind', 'mock', 'created_at']


class ReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReportSerializer
    def get_queryset(self):
        return Report.objects.filter(job__owner=self.request.user).select_related('job__document')

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        import io
        report = self.get_object()
        return FileResponse(io.BytesIO(render_pdf(report)), content_type='application/pdf',
                            as_attachment=True, filename=f'checkwise-report-{report.id}.pdf')


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'body', 'read', 'created_at']
        read_only_fields = ['id', 'title', 'body', 'created_at']


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    http_method_names = ['get', 'patch', 'head', 'options']
    def get_queryset(self):
        return Notification.objects.filter(owner=self.request.user)


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['id', 'email', 'subject', 'message', 'status', 'reply', 'created_at']
        read_only_fields = ['id', 'status', 'reply', 'created_at']
        extra_kwargs = {'message': {'max_length': 10000}}


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    http_method_names = ['get', 'post', 'head', 'options']
    def get_queryset(self):
        return Ticket.objects.filter(owner=self.request.user)
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, email=self.request.user.email)


@api_view(['POST'])
@permission_classes([AllowAny])
def contact(request):
    serializer = TicketSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response({'detail': 'Your message has been received.'}, status=201)


@api_view(['GET'])
def referrals(request):
    rewards = ReferralReward.objects.filter(referrer=request.user)
    return Response({'code': request.user.referral_code,
        'link': f'{settings.FRONTEND_URL}/register?ref={request.user.referral_code}',
        'referred_users': User.objects.filter(referred_by=request.user).count(),
        'rewarded_users': rewards.count(), 'earned_credits': str(rewards.aggregate(total=Sum('credits'))['total'] or 0),
        'role': request.user.role})


class TransferInput(serializers.Serializer):
    email = serializers.EmailField()
    credits = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    request_key = serializers.UUIDField()


@api_view(['POST'])
@permission_classes([VerifiedUser])
def reseller_transfer(request):
    if request.user.role != 'reseller':
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied('Reseller access required.')
    data = TransferInput(data=request.data)
    data.is_valid(raise_exception=True)
    recipient = get_object_or_404(User, email__iexact=data.validated_data['email'], is_active=True, email_verified=True)
    transfer(request.user, recipient, data.validated_data['credits'], data.validated_data['request_key'])
    return Response({'detail': 'Credits transferred.'})


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['id', 'name', 'ends_at', 'cancelled', 'created_at']
        read_only_fields = ['id', 'name', 'ends_at', 'created_at']


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    http_method_names = ['get', 'patch', 'head', 'options']
    def get_queryset(self):
        return Subscription.objects.filter(owner=self.request.user)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_overview(request):
    return Response({'users': User.objects.count(), 'documents': Document.objects.count(),
        'completed': DetectionJob.objects.filter(status='completed').count(),
        'failed_jobs': DetectionJob.objects.filter(status='failed').count(),
        'revenue_kes': Payment.objects.filter(status='paid', provider='mpesa').aggregate(total=Sum('amount'))['total'] or 0,
        'open_tickets': Ticket.objects.filter(status='open').count(),
        'review_payments': Payment.objects.filter(status='review').count()})


class AdjustmentInput(serializers.Serializer):
    email = serializers.EmailField()
    credits = serializers.DecimalField(max_digits=10, decimal_places=2)
    reason = serializers.CharField(min_length=5, max_length=255)
    request_key = serializers.UUIDField()


@api_view(['POST'])
@permission_classes([IsAdminUser])
@transaction.atomic
def admin_adjust(request):
    serializer = AdjustmentInput(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    user = get_object_or_404(User, email__iexact=data['email'])
    move(user, data['credits'], 0, 'admin_adjustment', f'admin:{request.user.pk}:{data["request_key"]}', data['reason'])
    AuditLog.objects.get_or_create(actor=request.user, action='credit_adjustment', target=str(data['request_key']),
        defaults={'detail': {'user': str(user.pk), 'amount': str(data['credits']), 'reason': data['reason']}})
    return Response({'detail': 'Adjustment recorded.'})
