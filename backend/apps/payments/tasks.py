from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from .models import Payment
from .providers import DarajaProvider
from .services import allocate


@shared_task
def verify_payment(payment_id, receipt=None):
    payment = Payment.objects.get(pk=payment_id)
    if payment.status != 'pending' or payment.provider != 'mpesa' or not payment.checkout_id:
        return
    try:
        status = DarajaProvider().verify(payment)
        if status == 'paid':
            # STK query verifies this checkout initiated server-side with snapshotted amount/phone.
            allocate(payment.pk, receipt)
        elif status == 'failed':
            Payment.objects.filter(pk=payment.pk, status='pending').update(status='failed', error='Payment declined or timed out.')
        elif payment.created_at < timezone.now() - timedelta(hours=24):
            Payment.objects.filter(pk=payment.pk, status='pending').update(status='review', error='Verification pending. Operator reconciliation required.')
    except Exception:
        # Keep pending for beat reconciliation; do not leak provider responses or assume failure.
        pass


@shared_task
def reconcile_pending():
    for payment in Payment.objects.filter(status='pending', provider='mpesa', checkout_id__isnull=False):
        verify_payment.delay(str(payment.pk))
