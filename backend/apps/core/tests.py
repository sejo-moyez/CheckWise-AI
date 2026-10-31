import io
import uuid
import tempfile
from decimal import Decimal
from unittest.mock import patch
from django.conf import settings
from django.core import signing, mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import override_settings
from rest_framework.test import APITransactionTestCase, APIClient
from apps.accounts.models import User
from apps.credits.models import Wallet, LedgerEntry
from apps.credits.services import move
from apps.detection.models import DetectionJob
from apps.detection.tasks import run_job
from apps.detection.providers import provider_for, GatewayProvider
from apps.documents.models import Document
from apps.payments.models import Payment, CreditPackage
from apps.payments.tasks import verify_payment
from apps.reports.models import Report
from apps.referrals.models import ReferralReward


@override_settings(DEBUG=True, CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True,
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', DETECTION_PROVIDER='mock',
    REWRITE_PROVIDER='mock', PAYMENT_PROVIDER='mock', SECURE_SSL_REDIRECT=False,
    CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class PlatformTests(APITransactionTestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.storage = tempfile.TemporaryDirectory()
        self.override = override_settings(MEDIA_ROOT=self.storage.name)
        self.override.enable()
        call_command('seed', verbosity=0)
        self.user = User.objects.create_user('writer@example.com', 'Unique-Writing-Password92!', email_verified=True)
        self.other = User.objects.create_user('other@example.com', 'Other-Password92!', email_verified=True)
        self.client.force_authenticate(self.user)
        self.package = CreditPackage.objects.filter(subscription_days=0).first()

    def tearDown(self):
        self.override.disable()
        self.storage.cleanup()

    def credit(self, amount='5'):
        move(self.user, amount, 0, 'test', f'test:{uuid.uuid4()}')

    def document(self):
        response = self.client.post('/api/v1/documents/', {'title': 'Research draft', 'text': 'A thoughtful original research passage with clear citations.'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def submit(self, doc, key=None, kind='combined'):
        return self.client.post('/api/v1/detection/', {'document': doc, 'kind': kind, 'request_key': str(key or uuid.uuid4())}, format='json')

    def test_register_verify_login_reset(self):
        client = APIClient()
        response = client.post('/api/v1/auth/register/', {'email':'new@example.com','password':'Original-LongPassword982!','first_name':'New'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(mail.outbox)
        user = User.objects.get(email='new@example.com')
        self.assertFalse(user.email_verified)
        token = signing.dumps({'id':str(user.pk),'email':user.email},salt='email-verify')
        self.assertEqual(client.post('/api/v1/auth/verify/',{'token':token}).status_code,200)
        login = client.post('/api/v1/auth/login/',{'email':user.email,'password':'Original-LongPassword982!'})
        self.assertEqual(login.status_code,200)
        self.assertTrue(login.cookies['cw_refresh']['httponly'])
        self.assertNotIn('refresh',login.data)
        client.post('/api/v1/auth/forgot/',{'email':user.email})
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        reset = client.post('/api/v1/auth/reset/',{'uid':urlsafe_base64_encode(force_bytes(user.pk)),
            'token':default_token_generator.make_token(user),'password':'A-Different-Password982!'})
        self.assertEqual(reset.status_code,200,reset.data)
        self.assertEqual(client.post('/api/v1/auth/login/',{'email':user.email,'password':'Original-LongPassword982!'}).status_code,401)

    def test_csrf_refresh_rotation_and_logout(self):
        client = APIClient(enforce_csrf_checks=True)
        csrf = client.get('/api/v1/auth/csrf/').data['csrf']
        response = client.post('/api/v1/auth/login/',{'email':self.user.email,'password':'Unique-Writing-Password92!'}, HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(response.status_code,200)
        self.assertEqual(client.post('/api/v1/auth/refresh/').status_code,403)
        csrf = client.get('/api/v1/auth/csrf/').data['csrf']
        old = client.cookies['cw_refresh'].value
        response = client.post('/api/v1/auth/refresh/',HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(response.status_code,200,response.data)
        self.assertNotEqual(old,client.cookies['cw_refresh'].value)
        self.assertEqual(client.post('/api/v1/auth/logout/',HTTP_X_CSRFTOKEN=csrf).status_code,200)
        self.assertEqual(client.post('/api/v1/auth/refresh/',HTTP_X_CSRFTOKEN=csrf).status_code,400)

    def test_unverified_user_cannot_purchase_or_upload(self):
        self.user.email_verified = False; self.user.save()
        self.assertEqual(self.client.post('/api/v1/documents/',{'title':'x','text':'words'}).status_code,403)
        self.assertEqual(self.client.post('/api/v1/payments/',{'package':str(self.package.pk),'phone':'0712345678'}).status_code,403)

    def test_upload_formats_and_private_download(self):
        from docx import Document as Docx
        from reportlab.pdfgen.canvas import Canvas
        stream = io.BytesIO(); doc = Docx(); doc.add_paragraph('Readable docx content'); doc.save(stream)
        pdf = io.BytesIO(); canvas = Canvas(pdf); canvas.drawString(40,700,'Readable PDF content'); canvas.save()
        for name, content in [('draft.txt',b'Readable UTF-8 text'),('draft.docx',stream.getvalue()),('draft.pdf',pdf.getvalue())]:
            upload = SimpleUploadedFile(name,content)
            response = self.client.post('/api/v1/documents/',{'title':name,'file':upload},format='multipart')
            self.assertEqual(response.status_code,201,response.data)
            download = self.client.get(f'/api/v1/documents/{response.data["id"]}/download/')
            self.assertEqual(download.status_code,200)
            self.assertTrue(b''.join(download.streaming_content))
            self.client.force_authenticate(self.other)
            self.assertEqual(self.client.get(f'/api/v1/documents/{response.data["id"]}/download/').status_code,404)
            self.client.force_authenticate(self.user)

    def test_invalid_uploads_rejected(self):
        from pypdf import PdfWriter
        encrypted = io.BytesIO(); writer=PdfWriter();writer.add_blank_page(width=100,height=100);writer.encrypt('secret');writer.write(encrypted)
        for name, content in [('bad.exe',b'bad'),('empty.txt',b'  '),('bad.pdf',b'not pdf'),('bad.docx',b'not zip'),('locked.pdf',encrypted.getvalue())]:
            response = self.client.post('/api/v1/documents/',{'title':'Bad','file':SimpleUploadedFile(name,content)},format='multipart')
            self.assertEqual(response.status_code,400,(name,response.data))
        with override_settings(MAX_UPLOAD_BYTES=5):
            self.assertEqual(self.client.post('/api/v1/documents/',{'title':'Big','file':SimpleUploadedFile('a.txt',b'a'*10)},format='multipart').status_code,400)

    def test_full_mock_flow_and_pdf(self):
        payment=self.client.post('/api/v1/payments/',{'package':str(self.package.pk),'phone':'0712345678'})
        self.assertEqual(payment.status_code,201,payment.data)
        payment_id=payment.data['id']
        self.assertFalse(LedgerEntry.objects.filter(kind='purchase').exists())
        for _ in range(2):
            self.assertEqual(self.client.post(f'/api/v1/payments/{payment_id}/mock-confirm/').status_code,200)
        self.assertEqual(LedgerEntry.objects.filter(kind='purchase').count(),1)
        doc=self.document();job=self.submit(doc)
        self.assertEqual(job.status_code,201,job.data)
        self.assertEqual(job.data['status'],'completed')
        self.assertTrue(job.data['result']['mock'])
        self.assertIsNone(job.data['result']['ai_likelihood'])
        self.assertIsNone(job.data['result']['similarity'])
        wallet=Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance,self.package.credits-1)
        self.assertEqual(wallet.reserved,0)
        report=self.client.get(f'/api/v1/reports/{job.data["report_id"]}/download/')
        body=b''.join(report.streaming_content)
        self.assertTrue(body.startswith(b'%PDF'))
        from pypdf import PdfReader
        self.assertIn('DEVELOPMENT MOCK', ''.join(p.extract_text() for p in PdfReader(io.BytesIO(body)).pages))

    def test_duplicate_job_does_not_double_charge(self):
        self.credit();doc=self.document();key=uuid.uuid4()
        first=self.submit(doc,key);second=self.submit(doc,key)
        self.assertEqual(first.data['id'],second.data['id'])
        self.assertEqual(DetectionJob.objects.count(),1)
        self.assertEqual(Wallet.objects.get(user=self.user).balance,4)
        run_job(first.data['id'])
        self.assertEqual(LedgerEntry.objects.filter(kind='consume').count(),1)

    def test_insufficient_balance_rolls_back_job(self):
        self.assertEqual(self.submit(self.document()).status_code,400)
        self.assertEqual(DetectionJob.objects.count(),0)
        self.assertEqual(LedgerEntry.objects.count(),0)

    def test_provider_failure_releases_reservation_once(self):
        self.credit();doc=self.document()
        with patch('apps.detection.tasks.process',side_effect=RuntimeError('secret provider body')):
            job=self.submit(doc)
        self.assertEqual(job.data['status'],'failed')
        self.assertNotIn('secret',job.data['error'])
        wallet=Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance,5);self.assertEqual(wallet.reserved,0)
        run_job(job.data['id'])
        self.assertEqual(LedgerEntry.objects.filter(kind='release').count(),1)

    def test_resource_owner_permissions(self):
        self.credit();doc=self.document();job=self.submit(doc).data
        self.client.force_authenticate(self.other)
        for path in [f'documents/{doc}/',f'detection/{job["id"]}/',f'reports/{job["report_id"]}/download/']:
            self.assertEqual(self.client.get('/api/v1/'+path).status_code,404)
        self.assertEqual(self.submit(doc).status_code,404)
        self.assertEqual(self.client.get('/api/v1/admin/overview/').status_code,403)

    def test_mock_disabled_in_production(self):
        with override_settings(DEBUG=False):
            with self.assertRaises(Exception):provider_for('ai')
            self.assertEqual(self.client.post('/api/v1/payments/',{'package':str(self.package.pk),'phone':'0712345678'}).status_code,400)

    def test_mpesa_callback_does_not_trust_payload(self):
        payment=Payment.objects.create(owner=self.user,package=self.package,amount=500,credits=5,phone='254712345678',provider='mpesa',checkout_id='checkout-1')
        client=APIClient()
        payload={'Body':{'stkCallback':{'CheckoutRequestID':'checkout-1','ResultCode':0}}}
        with override_settings(PAYMENT_PROVIDER='mpesa'), patch('apps.payments.providers.DarajaProvider.__init__',return_value=None), patch('apps.payments.providers.DarajaProvider.verify',return_value='pending'):
            self.assertEqual(client.post('/api/v1/payments/mpesa/callback/',payload,format='json').status_code,200)
        self.assertFalse(LedgerEntry.objects.filter(kind='purchase').exists())
        with patch('apps.payments.tasks.DarajaProvider') as adapter:
            adapter.return_value.verify.return_value='paid'
            verify_payment(str(payment.pk));verify_payment(str(payment.pk))
        self.assertEqual(LedgerEntry.objects.filter(kind='purchase').count(),1)
        self.assertEqual(Wallet.objects.get(user=self.user).balance,5)

    def test_subscription_and_referral_reward_once(self):
        self.other.referred_by=self.user;self.other.save()
        package=CreditPackage.objects.get(subscription_days=30)
        self.client.force_authenticate(self.other)
        for _ in range(2):
            payment=self.client.post('/api/v1/payments/',{'package':str(package.pk),'phone':'0712345678'}).data
            self.client.post(f'/api/v1/payments/{payment["id"]}/mock-confirm/')
        self.assertEqual(ReferralReward.objects.count(),1)
        self.assertEqual(Wallet.objects.get(user=self.user).balance,Decimal('0.50'))
        self.assertEqual(self.client.get('/api/v1/subscriptions/').data['count'],2)

    def test_reseller_transfer_and_insufficient_funds(self):
        self.credit();self.user.role='reseller';self.user.save();key=str(uuid.uuid4())
        self.other.reseller=self.user;self.other.save()
        data={'email':self.other.email,'credits':'2.50','request_key':key}
        for _ in range(2):self.assertEqual(self.client.post('/api/v1/referrals/transfer/',data).status_code,200)
        self.assertEqual(Wallet.objects.get(user=self.user).balance,Decimal('2.50'))
        self.assertEqual(Wallet.objects.get(user=self.other).balance,Decimal('2.50'))
        data.update(credits='3',request_key=str(uuid.uuid4()))
        self.assertEqual(self.client.post('/api/v1/referrals/transfer/',data).status_code,400)

    def test_customer_reseller_consent_and_metadata_permissions(self):
        self.user.role='reseller';self.user.save()
        self.client.force_authenticate(self.other)
        response=self.client.post('/api/v1/referrals/reseller/',{'code':self.user.referral_code})
        self.assertEqual(response.status_code,200)
        self.client.force_authenticate(self.user)
        data=self.client.get('/api/v1/referrals/customers/').data
        self.assertEqual(data['count'],1)
        self.assertEqual(data['results'][0]['email'],self.other.email)
        self.assertEqual(self.client.get(f'/api/v1/referrals/customers/{self.other.pk}/usage/').status_code,200)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/v1/referrals/customers/').status_code,403)
        self.client.post('/api/v1/referrals/reseller/',{'code':''})
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(f'/api/v1/referrals/customers/{self.other.pk}/usage/').status_code,404)

    def test_support_and_notifications_are_private(self):
        response=self.client.post('/api/v1/support/',{'email':self.user.email,'subject':'Question','message':'Please help with this report.'})
        self.assertEqual(response.status_code,201)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/v1/support/').data['count'],0)
        self.assertEqual(self.client.get('/api/v1/notifications/').data['count'],0)

    def test_delete_cleans_files_and_reports(self):
        self.credit();doc=self.document();self.submit(doc)
        self.assertEqual(self.client.delete(f'/api/v1/documents/{doc}/').status_code,204)
        self.assertEqual(Report.objects.count(),0)
        self.assertEqual(LedgerEntry.objects.filter(kind='consume').count(),1)

    def test_humanizer_mock_does_not_claim_rewriting(self):
        self.credit();job=self.submit(self.document(),kind='humanize').data
        self.assertTrue(job['result']['mock'])
        self.assertEqual(job['original_text'],job['result']['rewritten_text'])

    def test_quote_scales_by_word_allowance(self):
        doc=Document.objects.create(owner=self.user,title='Long',text='word '*1001,word_count=1001)
        response=self.client.post('/api/v1/detection/quote/',{'document':str(doc.pk),'kind':'combined'})
        self.assertEqual(response.data['credits'],'2.00')

    def test_staff_adjustment_and_audit(self):
        self.user.is_staff=True;self.user.save()
        payload={'email':self.other.email,'credits':'1.25','reason':'Support goodwill adjustment','request_key':str(uuid.uuid4())}
        for _ in range(2):self.assertEqual(self.client.post('/api/v1/admin/adjust/',payload).status_code,200)
        self.assertEqual(Wallet.objects.get(user=self.other).balance,Decimal('1.25'))
        self.assertEqual(self.client.get('/api/v1/admin/overview/').status_code,200)

    def test_gateway_response_validation(self):
        with override_settings(DETECTION_API_URL='https://licensed.example',DETECTION_API_KEY='test'):
            provider=GatewayProvider()
            with self.assertRaises(Exception):provider.normalize_results({'ai_likelihood':101})
            self.assertFalse(provider.normalize_results({'ai_likelihood':45,'sources':[]})['mock'])

    def test_purchase_request_is_idempotent(self):
        data={'package':str(self.package.pk),'phone':'0712345678','request_key':str(uuid.uuid4())}
        first=self.client.post('/api/v1/payments/',data)
        second=self.client.post('/api/v1/payments/',data)
        self.assertEqual(first.data['id'],second.data['id'])
        self.assertEqual(Payment.objects.count(),1)

    def test_promo_redemption_limits_and_idempotency(self):
        from apps.credits.models import PromoCode
        from django.utils import timezone
        from datetime import timedelta
        PromoCode.objects.create(code='WRITER',credits='2',max_uses=1,expires_at=timezone.now()+timedelta(days=1))
        for _ in range(2):
            self.assertEqual(self.client.post('/api/v1/credits/redeem/',{'code':'WRITER'}).status_code,200)
        self.assertEqual(Wallet.objects.get(user=self.user).balance,2)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post('/api/v1/credits/redeem/',{'code':'WRITER'}).status_code,400)

    def test_production_cookie_flags(self):
        with override_settings(DEBUG=False,COOKIE_SECURE=True):
            response=APIClient().post('/api/v1/auth/login/',{'email':self.user.email,'password':'Unique-Writing-Password92!'})
            self.assertTrue(response.cookies['cw_refresh']['secure'])
            self.assertTrue(response.cookies['cw_refresh']['httponly'])

    def test_simultaneous_spends_cannot_overdraw_postgres(self):
        from django.db import connection, close_old_connections
        from concurrent.futures import ThreadPoolExecutor
        if connection.vendor != 'postgresql':
            self.skipTest('Requires PostgreSQL row locks; run the suite in Docker.')
        self.credit('1')
        user_id=self.user.pk
        def spend(key):
            close_old_connections()
            try:
                user=User.objects.get(pk=user_id)
                move(user,-1,1,'reserve',key)
                return True
            except Exception as exc:
                from rest_framework.exceptions import ValidationError
                if not isinstance(exc,ValidationError):raise
                return False
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes=list(pool.map(spend,['concurrent-one','concurrent-two']))
        self.assertEqual(sorted(outcomes),[False,True])
        wallet=Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance,0)
        self.assertEqual(wallet.reserved,1)
