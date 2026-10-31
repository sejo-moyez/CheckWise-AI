import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured('DJANGO_SECRET_KEY is required outside development.')
    SECRET_KEY = 'development-only-checkwise-key-never-use-in-production'
if not DEBUG and (len(SECRET_KEY) < 50 or 'REPLACE_' in SECRET_KEY or 'development' in SECRET_KEY):
    raise ImproperlyConfigured('Production requires a unique random DJANGO_SECRET_KEY of at least 50 characters.')
BRAND_NAME = os.getenv('BRAND_NAME', 'CheckWise AI')
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',')
INSTALLED_APPS = [
    'django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes',
    'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles',
    'rest_framework', 'rest_framework_simplejwt.token_blacklist', 'corsheaders',
    'drf_spectacular',
    *['apps.' + x for x in ['core', 'accounts', 'credits', 'documents', 'detection',
       'reports', 'payments', 'subscriptions', 'referrals', 'notifications', 'support', 'analytics']],
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware', 'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware', 'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware', 'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware', 'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True,
              'OPTIONS': {'context_processors': ['django.template.context_processors.request',
                  'django.contrib.auth.context_processors.auth', 'django.contrib.messages.context_processors.messages']}}]
DATABASES = {'default': dj_database_url.parse(os.getenv('DATABASE_URL') or f'sqlite:///{BASE_DIR / "db.sqlite3"}', conn_max_age=60)}
DATABASES['default'].setdefault('OPTIONS', {})
if not DEBUG and not DATABASES['default']['ENGINE'].endswith('postgresql'):
    raise ImproperlyConfigured('Production requires PostgreSQL. SQLite is for development only.')
if DATABASES['default']['ENGINE'].endswith('sqlite3'):
    DATABASES['default']['OPTIONS']['timeout'] = 20
AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.AnonRateThrottle', 'rest_framework.throttling.UserRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {'anon': '60/hour', 'user': '600/hour', 'login': '10/min'},
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination', 'PAGE_SIZE': 30,
    'EXCEPTION_HANDLER': 'apps.core.api.exception_handler',
}
SIMPLE_JWT = {'ACCESS_TOKEN_LIFETIME': timedelta(minutes=10), 'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
              'ROTATE_REFRESH_TOKENS': True, 'BLACKLIST_AFTER_ROTATION': True,
              'AUTH_HEADER_TYPES': ('Bearer',), 'CHECK_REVOKE_TOKEN': True}
SPECTACULAR_SETTINGS = {'TITLE': BRAND_NAME + ' API', 'VERSION': '1.0.0', 'SERVE_INCLUDE_SCHEMA': False}
CORS_ALLOWED_ORIGINS = os.getenv('FRONTEND_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
CORS_ALLOW_CREDENTIALS = True
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SECURE = COOKIE_SECURE
CSRF_COOKIE_SECURE = COOKIE_SECURE
SESSION_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'
SECURE_SSL_REDIRECT = not DEBUG and os.getenv('SECURE_SSL_REDIRECT', 'true') == 'true'
# The deployment proxy MUST overwrite X-Forwarded-Proto and be the only public ingress.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_ROOT = BASE_DIR / 'media'
STORAGES = {'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
            'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'}}
if os.getenv('S3_BUCKET'):
    STORAGES['default'] = {'BACKEND': 'storages.backends.s3.S3Storage', 'OPTIONS': {
        'bucket_name': os.environ['S3_BUCKET'], 'endpoint_url': os.getenv('S3_ENDPOINT_URL') or None,
        'region_name': os.getenv('AWS_DEFAULT_REGION', 'us-east-1'), 'default_acl': None,
        'querystring_auth': True, 'querystring_expire': 120, 'file_overwrite': False}}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_BYTES + 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
MAX_DOCUMENT_WORDS = int(os.getenv('MAX_DOCUMENT_WORDS', '30000'))
RETENTION_DAYS = int(os.getenv('RETENTION_DAYS', '90'))
TIME_ZONE = 'Africa/Nairobi'
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_BROKER_URL = REDIS_URL
CELERY_TASK_ALWAYS_EAGER = DEBUG and os.getenv('CELERY_TASK_ALWAYS_EAGER', 'true') == 'true'
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_TASK_SOFT_TIME_LIMIT = 180
CELERY_TASK_TIME_LIMIT = 210
CELERY_BEAT_SCHEDULE = {
    'retention': {'task': 'apps.documents.tasks.purge_expired', 'schedule': 86400.0},
    'payments': {'task': 'apps.payments.tasks.reconcile_pending', 'schedule': 120.0},
    'jobs': {'task': 'apps.detection.tasks.recover_jobs', 'schedule': 120.0},
}
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}} if DEBUG else {
    'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache', 'LOCATION': REDIS_URL}}
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.filebased.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_FILE_PATH = BASE_DIR / 'emails'
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'true') == 'true'
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'CheckWise <no-reply@localhost>')
DETECTION_PROVIDER = os.getenv('DETECTION_PROVIDER', 'mock' if DEBUG else 'gateway')
DETECTION_API_URL = os.getenv('DETECTION_API_URL', '')
DETECTION_API_KEY = os.getenv('DETECTION_API_KEY', '')
REWRITE_PROVIDER = os.getenv('REWRITE_PROVIDER', 'mock' if DEBUG else 'gateway')
REWRITE_API_URL = os.getenv('REWRITE_API_URL', '')
REWRITE_API_KEY = os.getenv('REWRITE_API_KEY', '')
PAYMENT_PROVIDER = os.getenv('PAYMENT_PROVIDER', 'mock' if DEBUG else 'mpesa')
MPESA_ENV = os.getenv('MPESA_ENV', 'sandbox')
MPESA_CONSUMER_KEY = os.getenv('MPESA_CONSUMER_KEY', '')
MPESA_CONSUMER_SECRET = os.getenv('MPESA_CONSUMER_SECRET', '')
MPESA_SHORTCODE = os.getenv('MPESA_SHORTCODE', '')
MPESA_PASSKEY = os.getenv('MPESA_PASSKEY', '')
MPESA_CALLBACK_URL = os.getenv('MPESA_CALLBACK_URL', '')
MPESA_TRANSACTION_TYPE = os.getenv('MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline')
REQUIRE_EMAIL_VERIFICATION = os.getenv('REQUIRE_EMAIL_VERIFICATION', 'true') == 'true'
if not DEBUG and 'mock' in [DETECTION_PROVIDER, REWRITE_PROVIDER, PAYMENT_PROVIDER]:
    raise ImproperlyConfigured('Development mock adapters cannot be enabled in production.')
if not DEBUG and os.getenv('S3_ENDPOINT_URL') and not os.environ['S3_ENDPOINT_URL'].startswith('https://'):
    raise ImproperlyConfigured('Production S3 endpoints must use HTTPS.')
