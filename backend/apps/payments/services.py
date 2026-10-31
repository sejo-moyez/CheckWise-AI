from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from apps.credits.services import move
from apps.notifications.tasks import notify
from apps.referrals.models import ReferralReward
from apps.subscriptions.models import Subscription
from apps.core.models import SiteSetting
from .models import Payment


@transaction.atomic
def allocate(payment_id, receipt=None):
    # Caller must have independently verified the provider status, or be the DEBUG-only mock endpoint.
    payment = Payment.objects.select_for_update(of=('self',)).select_related('owner__referred_by', 'package').get(pk=payment_id)
    if payment.status == 'paid':
        return payment
    if payment.status not in ['pending', 'review']:
        return payment
    move(payment.owner, payment.credits, 0, 'purchase', f'payment:{payment.pk}')
    payment.status, payment.verified_at = 'paid', timezone.now()
    if receipt:
        payment.receipt = receipt
    payment.save(update_fields=['status', 'verified_at', 'receipt'])
    if payment.subscription_days:
        Subscription.objects.get_or_create(payment=payment, defaults={'owner': payment.owner,
            'name': payment.package.name, 'ends_at': timezone.now() + timedelta(days=payment.subscription_days)})
    referrer = payment.owner.referred_by
    # One reward per verified referred account, only on the first verified payment.
    if referrer and payment.owner.email_verified and referrer.email_verified:
        reward_setting = SiteSetting.objects.filter(key='referral_reward').first()
        from decimal import Decimal
        reward_amount = Decimal(str(reward_setting.value if reward_setting else '0.50'))
        if reward_amount > 0:
            reward, created = ReferralReward.objects.get_or_create(referred=payment.owner,
                defaults={'referrer': referrer, 'credits': reward_amount})
            if created:
                move(referrer, reward.credits, 0, 'referral', f'referral:{payment.owner.pk}')
    notify(payment.owner, 'Payment received', f'{payment.credits} credits have been added. Payment reference: {payment.pk}.')
    return payment
