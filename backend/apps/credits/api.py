from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.core.api import VerifiedUser
from .models import PromoCode, PromoRedemption
from .services import move


class RedeemInput(serializers.Serializer):
    code = serializers.CharField(max_length=40)


@extend_schema(request=RedeemInput,responses={'200': {'type':'object','properties':{'detail':{'type':'string'}}}})
@api_view(['POST'])
@permission_classes([VerifiedUser])
@transaction.atomic
def redeem(request):
    data = RedeemInput(data=request.data)
    data.is_valid(raise_exception=True)
    code = PromoCode.objects.select_for_update().filter(code__iexact=data.validated_data['code']).first()
    if not code or not code.active or code.expires_at <= timezone.now():
        raise ValidationError('This promotional code is invalid or expired.')
    if PromoRedemption.objects.filter(code=code,user=request.user).exists():
        return Response({'detail':'This code has already been applied to your account.'})
    if not PromoCode.objects.filter(pk=code.pk,uses__lt=F('max_uses')).update(uses=F('uses')+1):
        raise ValidationError('This promotional code has reached its redemption limit.')
    PromoRedemption.objects.create(code=code,user=request.user)
    move(request.user,code.credits,0,'promotion',f'promo:{code.pk}:{request.user.pk}')
    return Response({'detail':f'{code.credits} promotional credits were added.'})
