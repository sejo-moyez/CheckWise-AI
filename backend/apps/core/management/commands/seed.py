from django.core.management.base import BaseCommand
from apps.credits.models import ServicePrice
from apps.payments.models import CreditPackage
from apps.detection.models import Provider
from apps.core.models import SiteSetting


class Command(BaseCommand):
    help = 'Create initial pricing without overriding administrator changes or granting credits.'

    def handle(self, *args, **options):
        for kind, price in [('combined', '1.00'), ('plagiarism', '0.50'), ('ai', '0.25'), ('humanize', '1.00')]:
            ServicePrice.objects.get_or_create(kind=kind, defaults={'credits': price, 'word_allowance': 1000})
        for credits in [5, 10, 25, 50, 100]:
            CreditPackage.objects.get_or_create(name=f'{credits} credits', defaults={'credits': credits, 'price_kes': credits * 100})
        CreditPackage.objects.get_or_create(name='Research monthly — prepaid', defaults={
            'credits': 25, 'price_kes': 2200, 'subscription_days': 30})
        for name in ['mock', 'gateway']:
            Provider.objects.get_or_create(name=name)
        SiteSetting.objects.get_or_create(key='referral_reward', defaults={'value': '0.50',
            'description': 'Credits rewarded after a referred verified account makes its first verified purchase.'})
        self.stdout.write(self.style.SUCCESS('Initial pricing available. Existing values preserved.'))
