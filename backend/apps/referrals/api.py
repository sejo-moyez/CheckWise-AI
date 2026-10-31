from django.db import transaction
from django.db.models import Sum, Count
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiTypes
from apps.accounts.models import User
from apps.core.api import VerifiedUser
from apps.core.models import AuditLog
from apps.credits.models import CreditTransfer
from apps.detection.models import DetectionJob


class ResellerLinkInput(serializers.Serializer):
    code = serializers.CharField(max_length=12, allow_blank=True)


@extend_schema(request=ResellerLinkInput, responses=OpenApiTypes.OBJECT)
@api_view(['GET', 'POST'])
@permission_classes([VerifiedUser])
def reseller_link(request):
    if request.method == 'POST':
        if request.user.role != 'user':
            raise ValidationError('Only customer accounts can link a reseller.')
        data = ResellerLinkInput(data=request.data); data.is_valid(raise_exception=True)
        code = data.validated_data['code']
        reseller = None
        if code:
            reseller = User.objects.filter(referral_code=code, role='reseller', is_active=True, email_verified=True).first()
            if not reseller or reseller.pk == request.user.pk:
                raise ValidationError('No verified active reseller matches this code.')
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            user.reseller = reseller
            user.save(update_fields=['reseller'])
            AuditLog.objects.create(actor=user, action='reseller_link', target=str(reseller.pk) if reseller else 'disconnected')
    else:
        reseller = request.user.reseller
    return Response({'reseller': {'email':reseller.email,'name':reseller.first_name} if reseller else None,
                     'detail': 'Reseller preference saved.' if request.method == 'POST' else ''})


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(['GET'])
@permission_classes([VerifiedUser])
def customers(request):
    if request.user.role != 'reseller':
        raise PermissionDenied('Reseller access required.')
    rows = User.objects.filter(reseller=request.user).order_by('email')
    pager = PageNumberPagination()
    selected = pager.paginate_queryset(rows, request)
    result = []
    for user in selected:
        credits = CreditTransfer.objects.filter(sender=request.user,recipient=user).aggregate(total=Sum('credits'))['total'] or 0
        result.append({'id':str(user.pk),'email':user.email,'name':user.first_name,
                       'allocated':str(credits),'completed_checks':DetectionJob.objects.filter(owner=user,status='completed').count()})
    return pager.get_paginated_response(result)


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(['GET'])
@permission_classes([VerifiedUser])
def customer_usage(request, customer_id):
    if request.user.role != 'reseller':
        raise PermissionDenied('Reseller access required.')
    user = get_object_or_404(User, pk=customer_id, reseller=request.user)
    pager = PageNumberPagination()
    # Customer opt-in allows metadata only. Original text, titles and private reports stay owner-only.
    rows = DetectionJob.objects.filter(owner=user).values('kind','status','cost','created_at','document__word_count')
    selected = pager.paginate_queryset(rows, request)
    return pager.get_paginated_response(selected)
