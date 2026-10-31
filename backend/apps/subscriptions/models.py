from django.conf import settings
from django.db import models
from apps.core.models import Entity
from apps.payments.models import Payment


class Subscription(Entity):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    payment = models.OneToOneField(Payment, on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    ends_at = models.DateTimeField()
    cancelled = models.BooleanField(default=False)
