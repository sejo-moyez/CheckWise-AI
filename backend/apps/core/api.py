from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.permissions import BasePermission


def exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        exc = ValidationError(exc.messages)
    response = drf_exception_handler(exc, context)
    return response


class VerifiedUser(BasePermission):
    message = 'Verify your email before using paid services.'

    def has_permission(self, request, view):
        from django.conf import settings
        return bool(request.user.is_authenticated and
                    (request.user.email_verified or not settings.REQUIRE_EMAIL_VERIFICATION))
