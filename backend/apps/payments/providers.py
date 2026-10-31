import base64
from datetime import datetime
from zoneinfo import ZoneInfo
import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class DarajaProvider:
    def __init__(self):
        if settings.MPESA_ENV not in ['sandbox', 'production']:
            raise ImproperlyConfigured('MPESA_ENV must be sandbox or production.')
        if not all([settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET, settings.MPESA_SHORTCODE,
                    settings.MPESA_PASSKEY, settings.MPESA_CALLBACK_URL.startswith('https://')]):
            raise ImproperlyConfigured('Daraja credentials and a public HTTPS callback must be configured.')
        self.base = 'https://sandbox.safaricom.co.ke' if settings.MPESA_ENV == 'sandbox' else 'https://api.safaricom.co.ke'

    def post(self, path, payload):
        token_response = requests.get(self.base + '/oauth/v1/generate', params={'grant_type': 'client_credentials'},
            auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET), timeout=(5, 20), allow_redirects=False)
        token_response.raise_for_status()
        response = requests.post(self.base + path, json=payload,
            headers={'Authorization': 'Bearer ' + token_response.json()['access_token']}, timeout=(5, 25), allow_redirects=False)
        response.raise_for_status()
        return response.json()

    def credentials(self):
        timestamp = datetime.now(ZoneInfo('Africa/Nairobi')).strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f'{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}'.encode()).decode()
        return {'BusinessShortCode': settings.MPESA_SHORTCODE, 'Password': password, 'Timestamp': timestamp}

    def initiate(self, payment):
        data = self.post('/mpesa/stkpush/v1/processrequest', {**self.credentials(),
            'TransactionType': settings.MPESA_TRANSACTION_TYPE, 'Amount': payment.amount,
            'PartyA': payment.phone, 'PartyB': settings.MPESA_SHORTCODE, 'PhoneNumber': payment.phone,
            'CallBackURL': settings.MPESA_CALLBACK_URL, 'AccountReference': str(payment.id)[:12],
            'TransactionDesc': 'CheckWise credits'})
        if str(data.get('ResponseCode')) != '0' or not data.get('CheckoutRequestID'):
            raise ValueError('Daraja rejected initiation.')
        return data['CheckoutRequestID']

    def verify(self, payment):
        result = self.post('/mpesa/stkpushquery/v1/query', {**self.credentials(), 'CheckoutRequestID': payment.checkout_id})
        code = str(result.get('ResultCode', 'pending'))
        if code == '0':
            return 'paid'
        if code in ['1032', '1037', '1', '2001']:
            return 'failed'
        return 'pending'
