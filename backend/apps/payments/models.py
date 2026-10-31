import uuid
from django.conf import settings
from django.db import models
from apps.core.models import Entity


class CreditPackage(Entity):
    name = models.CharField(max_length=100)
    credits = models.DecimalField(max_digits=10, decimal_places=2)
    price_kes = models.PositiveIntegerField()
    active = models.BooleanField(default=True)
    subscription_days = models.PositiveIntegerField(default=0)

    class Meta(Entity.Meta):
        constraints = [models.CheckConstraint(condition=models.Q(credits__gt=0), name='package_credits_positive'),
                       models.CheckConstraint(condition=models.Q(price_kes__gt=0), name='package_price_positive')]


class Payment(Entity):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    package = models.ForeignKey(CreditPackage, on_delete=models.PROTECT)
    amount = models.PositiveIntegerField()
    credits = models.DecimalField(max_digits=10, decimal_places=2)
    subscription_days = models.PositiveIntegerField(default=0)
    phone = models.CharField(max_length=12)
    provider = models.CharField(max_length=20)
    checkout_id = models.CharField(max_length=200, unique=True, null=True)
    receipt = models.CharField(max_length=200, unique=True, null=True)
    status = models.CharField(max_length=20, default='pending', db_index=True)
    error = models.CharField(max_length=255, blank=True)
    verified_at = models.DateTimeField(null=True)
    request_key = models.UUIDField(default=uuid.uuid4)

    class Meta(Entity.Meta):
        constraints = [models.UniqueConstraint(fields=['owner', 'request_key'], name='payment_request_unique')]


class PaymentCallback(Entity):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE)
    result_code = models.CharField(max_length=20)
    # Do not retain arbitrary callback bodies, phone numbers or untrusted secrets.
