"""Explicit schema annotations for non-model operations and multipart uploads."""
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiTypes, inline_serializer
from rest_framework import serializers as s


def configure_schema():
    from apps.accounts import api as auth
    from apps.documents.api import DocumentViewSet, DocumentInput, DocumentSerializer
    from apps.documents.models import Document
    from apps.detection.api import JobViewSet
    from apps.detection.models import DetectionJob
    from apps.detection.serializers import JobInput, JobSerializer
    from apps.payments.api import PaymentViewSet, PurchaseInput, PaymentSerializer, Callback
    from apps.payments.models import Payment
    from apps.credits.models import LedgerEntry
    from apps.reports.models import Report
    from apps.notifications.models import Notification
    from apps.subscriptions.models import Subscription
    from apps.support.models import Ticket
    from . import views

    detail = inline_serializer('Message', {'detail': s.CharField()})
    login = inline_serializer('LoginResponse', {'access':s.CharField(),'user':auth.UserSerializer(),'csrf':s.CharField()})
    schemas = {
        auth.Register: (auth.Credentials, detail), auth.Login: (auth.Credentials, login),
        auth.CSRF: (None, inline_serializer('CSRFToken', {'csrf':s.CharField()})),
        auth.Refresh: (None, inline_serializer('AccessToken', {'access':s.CharField()})),
        auth.Logout: (None, detail), auth.Verify: (inline_serializer('VerifyEmail', {'token':s.CharField()}), detail),
        auth.ResendVerification: (None, detail),
        auth.Forgot: (inline_serializer('ForgotPassword', {'email':s.EmailField()}),detail),
        auth.Reset: (inline_serializer('ResetPassword', {'uid':s.CharField(),'token':s.CharField(),'password':s.CharField(write_only=True)}),detail),
    }
    for cls, (request, response) in schemas.items():
        extend_schema(request=request, responses=response)(cls)
    extend_schema_view(get=extend_schema(responses=auth.UserSerializer),
                       patch=extend_schema(request=auth.UserSerializer,responses=auth.UserSerializer))(auth.Me)
    for name in ['health','configuration','dashboard','wallet','referrals','admin_overview']:
        setattr(views,name,extend_schema(responses=OpenApiTypes.OBJECT)(getattr(views,name)))
    for name, request in [('contact',views.TicketSerializer),('reseller_transfer',views.TransferInput),('admin_adjust',views.AdjustmentInput)]:
        setattr(views,name,extend_schema(request=request,responses=detail)(getattr(views,name)))
    extend_schema(request=OpenApiTypes.OBJECT,responses=OpenApiTypes.OBJECT)(Callback)
    for cls, model in [(DocumentViewSet,Document),(JobViewSet,DetectionJob),(PaymentViewSet,Payment),
        (views.LedgerViewSet,LedgerEntry),(views.ReportViewSet,Report),(views.NotificationViewSet,Notification),
        (views.SubscriptionViewSet,Subscription),(views.TicketViewSet,Ticket)]:
        cls.queryset=model.objects.none()
    extend_schema_view(create=extend_schema(request=DocumentInput,responses={201:DocumentSerializer}),
                       download=extend_schema(responses=OpenApiTypes.BINARY))(DocumentViewSet)
    extend_schema_view(create=extend_schema(request=JobInput,responses={201:JobSerializer}),
        quote=extend_schema(request=JobInput,responses=inline_serializer('Quote',{'credits':s.DecimalField(max_digits=10,decimal_places=2),'words':s.IntegerField()})))(JobViewSet)
    extend_schema_view(create=extend_schema(request=PurchaseInput,responses={201:PaymentSerializer}),
        reconcile=extend_schema(request=None,responses=detail),mock_confirm=extend_schema(request=None,responses=PaymentSerializer))(PaymentViewSet)
    extend_schema_view(download=extend_schema(responses=OpenApiTypes.BINARY))(views.ReportViewSet)
