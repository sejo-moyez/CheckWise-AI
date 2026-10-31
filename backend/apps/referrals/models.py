from django.conf import settings
from django.db import models
from apps.core.models import Entity


class ReferralReward(Entity):
    referrer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='referral_rewards')
    referred = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    credits = models.DecimalField(max_digits=8, decimal_places=2)
