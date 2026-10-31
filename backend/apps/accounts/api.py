from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from apps.credits.models import Wallet
from apps.notifications.tasks import email_message
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'email_verified', 'referral_code', 'is_staff']
        read_only_fields = ['id', 'email', 'role', 'email_verified', 'referral_code', 'is_staff']


class Credentials(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, write_only=True)
    first_name = serializers.CharField(max_length=150, required=False)
    referral_code = serializers.CharField(max_length=12, required=False, allow_blank=True)


def refresh_cookie(response, token):
    response.set_cookie('cw_refresh', str(token), max_age=7 * 86400, httponly=True,
        secure=settings.COOKIE_SECURE, samesite='Lax', path='/api/v1/auth/')
    return response


def verification_mail(user):
    token = signing.dumps({'id': str(user.pk), 'email': user.email}, salt='email-verify')
    link = settings.FRONTEND_URL + '/verify-email?token=' + token
    transaction.on_commit(lambda: email_message.delay(user.email, 'Verify your email', f'Verify your CheckWise account: {link}'))


class Register(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    @transaction.atomic
    def post(self, request):
        serializer = Credentials(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data['email'].lower()
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError('An account with this email already exists.')
        user = User(email=email, first_name=data.get('first_name', ''))
        validate_password(data['password'], user)
        code = data.get('referral_code')
        if code:
            user.referred_by = User.objects.filter(referral_code=code, email_verified=True).first()
            if not user.referred_by:
                raise ValidationError('Referral code is not valid.')
        user.set_password(data['password'])
        user.save()
        Wallet.objects.create(user=user)
        verification_mail(user)
        return Response({'detail': 'Account created. Check your email to verify before using paid services.'}, status=201)


@method_decorator(csrf_protect, name='dispatch')
class Login(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = Credentials(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = authenticate(email=data['email'].lower(), password=data['password'])
        if not user:
            return Response({'detail': 'Email or password is incorrect.'}, status=401)
        token = RefreshToken.for_user(user)
        response = Response({'access': str(token.access_token), 'user': UserSerializer(user).data,
                             'csrf': get_token(request)})
        return refresh_cookie(response, token)


class CSRF(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({'csrf': get_token(request)})


@method_decorator(csrf_protect, name='dispatch')
class Refresh(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = TokenRefreshSerializer(data={'refresh': request.COOKIES.get('cw_refresh', '')})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        response = Response({'access': data['access']})
        return refresh_cookie(response, data['refresh'])


@method_decorator(csrf_protect, name='dispatch')
class Logout(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        from rest_framework_simplejwt.exceptions import TokenError
        try:
            RefreshToken(request.COOKIES.get('cw_refresh', '')).blacklist()
        except TokenError:
            pass
        response = Response({'detail': 'Signed out.'})
        response.delete_cookie('cw_refresh', path='/api/v1/auth/', samesite='Lax')
        return response


class Me(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class Verify(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = signing.loads(str(request.data.get('token', '')), salt='email-verify', max_age=86400)
            user = User.objects.get(pk=data['id'], email=data['email'], is_active=True)
        except (signing.BadSignature, User.DoesNotExist, ValueError, KeyError):
            raise ValidationError('Verification link is invalid or expired.')
        user.email_verified = True
        user.save(update_fields=['email_verified'])
        return Response({'detail': 'Email verified. You can now use paid services.'})


class ResendVerification(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'
    def post(self, request):
        if not request.user.email_verified:
            verification_mail(request.user)
        return Response({'detail': 'Verification email requested.'})


class Forgot(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        field = serializers.EmailField()
        email = field.run_validation(request.data.get('email'))
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}'
            email_message.delay(user.email, 'Reset your password', f'Reset your password: {link}')
        return Response({'detail': 'If the account exists, a reset email has been sent.'})


class Reset(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(request.data.get('uid', ''))), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError, UnicodeDecodeError):
            raise ValidationError('Invalid reset link.')
        if not default_token_generator.check_token(user, str(request.data.get('token', ''))):
            raise ValidationError('Invalid or expired reset link.')
        password = serializers.CharField(max_length=128).run_validation(request.data.get('password'))
        validate_password(password, user)
        user.set_password(password)
        user.save(update_fields=['password'])
        # Revoke all outstanding refresh tokens on password reset.
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response({'detail': 'Password changed. Please sign in.'})
