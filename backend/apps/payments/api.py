import re
import uuid
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.core.api import VerifiedUser
from .models import CreditPackage, Payment, PaymentCallback
from .providers import DarajaProvider
from .services import allocate
from .tasks import verify_payment


class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditPackage
        fields = ['id', 'name', 'credits', 'price_kes', 'subscription_days']


class PaymentSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='package.name', read_only=True)
    class Meta:
        model = Payment
        fields = ['id', 'package_name', 'amount', 'credits', 'provider', 'status', 'receipt', 'error', 'created_at', 'verified_at']
        read_only_fields = fields


class PurchaseInput(serializers.Serializer):
    package = serializers.UUIDField()
    phone = serializers.CharField(max_length=20)
    request_key = serializers.UUIDField(default=uuid.uuid4)

    def validate_phone(self, value):
        value = re.sub(r'[\s+()-]', '', value)
        if value.startswith('0'):
            value = '254' + value[1:]
        if not re.fullmatch(r'254[17]\d{8}', value):
            raise ValidationError('Enter a valid Kenyan M-Pesa number (07…, 01… or 254…).')
        return value


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [VerifiedUser]

    def get_queryset(self):
        return Payment.objects.filter(owner=self.request.user).select_related('package')

    def create(self, request):
        data = PurchaseInput(data=request.data)
        data.is_valid(raise_exception=True)
        package = get_object_or_404(CreditPackage, pk=data.validated_data['package'], active=True)
        provider = settings.PAYMENT_PROVIDER
        if provider not in ['mock', 'mpesa'] or provider == 'mock' and not settings.DEBUG:
            raise ValidationError('Payment provider is not configured for this environment.')
        payment, created = Payment.objects.get_or_create(owner=request.user, request_key=data.validated_data['request_key'],
            defaults={'package': package, 'amount': package.price_kes, 'credits': package.credits,
            'subscription_days': package.subscription_days, 'phone': data.validated_data['phone'], 'provider': provider})
        if not created:
            if payment.package_id != package.pk or payment.phone != data.validated_data['phone']:
                raise ValidationError('Purchase request key was already used for another payment.')
            return Response(PaymentSerializer(payment).data)
        if provider == 'mpesa':
            try:
                payment.checkout_id = DarajaProvider().initiate(payment)
                payment.save(update_fields=['checkout_id'])
            except Exception:
                payment.status, payment.error = 'review', 'Initiation could not be confirmed. Contact support; do not retry if an STK prompt arrived.'
                payment.save(update_fields=['status', 'error'])
        return Response(PaymentSerializer(payment).data, status=201)

    @action(detail=True, methods=['post'], url_path='mock-confirm')
    def mock_confirm(self, request, pk=None):
        payment = self.get_object()
        if not settings.DEBUG or settings.PAYMENT_PROVIDER != 'mock' or payment.provider != 'mock':
            raise ValidationError('Payment simulation is disabled.')
        return Response(PaymentSerializer(allocate(payment.pk)).data)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        payment = self.get_object()
        if payment.provider == 'mpesa':
            verify_payment.delay(str(payment.pk))
        return Response({'detail': 'Verification requested. Refresh payment status shortly.'})


class Callback(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if settings.PAYMENT_PROVIDER != 'mpesa':
            return Response({'detail': 'Not found.'}, status=404)
        if request.content_type != 'application/json' or len(request.body) > 16384:
            raise ValidationError('Invalid callback payload.')
        try:
            callback = request.data['Body']['stkCallback']
            checkout_id = str(callback['CheckoutRequestID'])
            code = str(callback['ResultCode'])[:20]
            payment = Payment.objects.get(checkout_id=checkout_id, provider='mpesa')
        except (KeyError, TypeError, Payment.DoesNotExist):
            return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})
        PaymentCallback.objects.create(payment=payment, result_code=code)
        # Callback is an unauthenticated hint only. Query Daraja independently; never credit from callback fields.
        verify_payment.delay(str(payment.pk))
        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})
