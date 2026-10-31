from django.conf import settings
from django.db import models
from apps.core.models import Entity


class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, primary_key=True, on_delete=models.PROTECT)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    reserved = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(balance__gte=0), name='wallet_balance_nonnegative'),
                       models.CheckConstraint(condition=models.Q(reserved__gte=0), name='wallet_reserved_nonnegative')]


class LedgerEntry(Entity):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reserved_delta = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    kind = models.CharField(max_length=30)
    reference = models.CharField(max_length=200, unique=True)
    note = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError('Ledger entries are immutable.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError('Ledger entries are immutable.')


class ServicePrice(models.Model):
    kind = models.CharField(max_length=20, primary_key=True, choices=[(x, x) for x in ['combined', 'plagiarism', 'ai', 'humanize']])
    credits = models.DecimalField(max_digits=8, decimal_places=2)
    word_allowance = models.PositiveIntegerField(default=1000)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(credits__gt=0), name='price_positive'),
                       models.CheckConstraint(condition=models.Q(word_allowance__gt=0), name='allowance_positive')]


class PromoCode(models.Model):
    code = models.CharField(max_length=40, primary_key=True)
    credits = models.DecimalField(max_digits=8, decimal_places=2)
    max_uses = models.PositiveIntegerField(default=100)
    uses = models.PositiveIntegerField(default=0, editable=False)
    expires_at = models.DateTimeField()
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(credits__gt=0), name='promo_credits_positive'),
                       models.CheckConstraint(condition=models.Q(uses__lte=models.F('max_uses')), name='promo_usage_limit')]


class PromoRedemption(Entity):
    code = models.ForeignKey(PromoCode, on_delete=models.PROTECT)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta(Entity.Meta):
        constraints = [models.UniqueConstraint(fields=['code', 'user'], name='promo_once_per_user')]


class CreditTransfer(Entity):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='sent_allocations')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='received_allocations')
    credits = models.DecimalField(max_digits=10, decimal_places=2)
    request_key = models.UUIDField()

    class Meta(Entity.Meta):
        constraints = [models.UniqueConstraint(fields=['sender', 'request_key'], name='transfer_request_unique')]
