from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.accounts import api as auth
from apps.documents.api import DocumentViewSet
from apps.detection.api import JobViewSet
from apps.payments.api import PaymentViewSet, Callback
from apps.core import views
from apps.core.schema import configure_schema
from apps.credits.api import redeem
from apps.referrals.api import reseller_link, customers, customer_usage

configure_schema()

router = DefaultRouter()
router.register('documents', DocumentViewSet, basename='documents')
router.register('detection', JobViewSet, basename='detection')
router.register('payments', PaymentViewSet, basename='payments')
router.register('reports', views.ReportViewSet, basename='reports')
router.register('credits/ledger', views.LedgerViewSet, basename='ledger')
router.register('notifications', views.NotificationViewSet, basename='notifications')
router.register('support', views.TicketViewSet, basename='support')
router.register('subscriptions', views.SubscriptionViewSet, basename='subscriptions')
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', views.health), path('api/v1/config/', views.configuration),
    path('api/v1/auth/register/', auth.Register.as_view()), path('api/v1/auth/login/', auth.Login.as_view()),
    path('api/v1/auth/csrf/', auth.CSRF.as_view()), path('api/v1/auth/refresh/', auth.Refresh.as_view()),
    path('api/v1/auth/logout/', auth.Logout.as_view()), path('api/v1/auth/me/', auth.Me.as_view()),
    path('api/v1/auth/verify/', auth.Verify.as_view()), path('api/v1/auth/resend/', auth.ResendVerification.as_view()),
    path('api/v1/auth/forgot/', auth.Forgot.as_view()), path('api/v1/auth/reset/', auth.Reset.as_view()),
    path('api/v1/dashboard/', views.dashboard), path('api/v1/credits/', views.wallet),
    path('api/v1/credits/redeem/', redeem),
    path('api/v1/payments/mpesa/callback/', Callback.as_view()),
    path('api/v1/referrals/', views.referrals), path('api/v1/referrals/transfer/', views.reseller_transfer),
    path('api/v1/referrals/reseller/', reseller_link), path('api/v1/referrals/customers/', customers),
    path('api/v1/referrals/customers/<uuid:customer_id>/usage/', customer_usage),
    path('api/v1/contact/', views.contact),
    path('api/v1/admin/overview/', views.admin_overview), path('api/v1/admin/adjust/', views.admin_adjust),
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='api-docs'),
    path('api/v1/', include(router.urls)),
]
