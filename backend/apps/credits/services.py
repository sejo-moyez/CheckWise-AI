import math
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError
from apps.core.models import AuditLog
from .models import Wallet, LedgerEntry, ServicePrice, CreditTransfer


@transaction.atomic
def move(user, amount, reserved_delta, kind, reference, note=''):
    amount, reserved_delta = Decimal(str(amount)), Decimal(str(reserved_delta))
    wallet, _ = Wallet.objects.get_or_create(user=user)
    wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
    existing = LedgerEntry.objects.filter(reference=reference).first()
    if existing:
        if existing.user_id != user.pk or existing.amount != amount or existing.reserved_delta != reserved_delta:
            raise ValidationError('Idempotency key was used for another movement.')
        return existing
    updated = Wallet.objects.filter(pk=wallet.pk, balance__gte=max(-amount, 0),
                                    reserved__gte=max(-reserved_delta, 0)).update(
        balance=F('balance') + amount, reserved=F('reserved') + reserved_delta)
    if not updated:
        raise ValidationError('Insufficient available credits or invalid reservation.')
    wallet.refresh_from_db()
    return LedgerEntry.objects.create(user=user, amount=amount, reserved_delta=reserved_delta,
        balance_after=wallet.balance, kind=kind, reference=reference, note=note)


def cost_for(kind, words):
    price = ServicePrice.objects.get(kind=kind)
    return price.credits * max(1, math.ceil(words / price.word_allowance))


@transaction.atomic
def transfer(sender, recipient, amount, request_key):
    amount = Decimal(str(amount))
    if amount <= 0 or amount.as_tuple().exponent < -2 or sender == recipient:
        raise ValidationError('Choose another customer and a positive amount with at most two decimals.')
    customer = type(recipient).objects.select_for_update().get(pk=recipient.pk)
    if customer.reseller_id != sender.pk:
        raise ValidationError('The customer must first link your reseller code in account settings.')
    existing = CreditTransfer.objects.filter(sender=sender, request_key=request_key).first()
    if existing:
        if existing.recipient_id != recipient.pk or existing.credits != amount:
            raise ValidationError('Transfer request key was used for another allocation.')
        return existing
    # Stable lock order avoids deadlocks across opposite-direction transfers.
    for user in sorted([sender, recipient], key=lambda u: str(u.pk)):
        Wallet.objects.get_or_create(user=user)
    list(Wallet.objects.select_for_update().filter(user__in=[sender, recipient]).order_by('user_id'))
    move(sender, -amount, 0, 'transfer_out', f'transfer:{sender.pk}:{request_key}:out')
    move(recipient, amount, 0, 'transfer_in', f'transfer:{sender.pk}:{request_key}:in')
    value = CreditTransfer.objects.create(sender=sender, recipient=recipient, credits=amount, request_key=request_key)
    AuditLog.objects.create(actor=sender, action='credit_transfer', target=str(recipient.pk), detail={'credits': str(amount)})
    return value
