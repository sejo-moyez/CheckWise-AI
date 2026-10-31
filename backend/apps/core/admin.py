from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.admin.models import LogEntry
from apps.accounts.models import User
from apps.credits.models import Wallet, LedgerEntry, ServicePrice, PromoCode, PromoRedemption, CreditTransfer
from apps.documents.models import Document
from apps.detection.models import DetectionJob, Provider
from apps.reports.models import Report
from apps.payments.models import CreditPackage, Payment, PaymentCallback
from apps.payments.tasks import verify_payment
from apps.subscriptions.models import Subscription
from apps.referrals.models import ReferralReward
from apps.notifications.models import Notification
from apps.notifications.tasks import notify
from apps.support.models import Ticket
from .models import AuditLog, SiteSetting


class AuditedAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        AuditLog.objects.create(actor=request.user, action='update' if change else 'create',
            target=f'{obj._meta.label}:{obj.pk}', detail={'fields': form.changed_data})

    def delete_model(self, request, obj):
        AuditLog.objects.create(actor=request.user, action='delete', target=f'{obj._meta.label}:{obj.pk}')
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            self.delete_model(request, obj)


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False
    def has_change_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(User)
class AccountsAdmin(UserAdmin, AuditedAdmin):
    ordering = ['email']
    list_display = ['email', 'first_name', 'role', 'email_verified', 'is_active', 'is_staff']
    list_filter = ['role', 'email_verified', 'is_active', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name']
    fieldsets = [(None, {'fields': ['email', 'password']}),
        ('Profile', {'fields': ['first_name', 'last_name', 'role', 'email_verified']}),
        ('Permissions', {'fields': ['is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions']})]
    add_fieldsets = [(None, {'fields': ['email', 'password1', 'password2']})]

    def has_change_permission(self, request, obj=None):
        if obj and (obj.is_staff or obj.is_superuser) and not request.user.is_superuser:
            return False
        return super().has_change_permission(request, obj)

    def get_readonly_fields(self, request, obj=None):
        return [] if request.user.is_superuser else ['is_staff', 'is_superuser', 'groups', 'user_permissions']


@admin.register(Payment)
class PaymentAdmin(ReadOnlyAdmin):
    list_display = ['id', 'owner', 'amount', 'provider', 'status', 'created_at']
    list_filter = ['provider', 'status']
    search_fields = ['id', 'owner__email', 'checkout_id', 'receipt']
    actions = ['reconcile']

    @admin.action(description='Query Daraja for selected pending payments')
    def reconcile(self, request, queryset):
        for payment in queryset.filter(provider='mpesa', status='pending'):
            verify_payment.delay(str(payment.pk))
            AuditLog.objects.create(actor=request.user, action='payment_reconcile', target=str(payment.pk))


@admin.register(DetectionJob)
class JobAdmin(ReadOnlyAdmin):
    list_display = ['id', 'owner', 'kind', 'status', 'cost', 'created_at']
    list_filter = ['kind', 'status', 'provider']
    search_fields = ['id', 'owner__email']


@admin.register(Ticket)
class TicketAdmin(AuditedAdmin):
    list_display = ['subject', 'email', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['email', 'subject']
    readonly_fields = ['owner', 'email', 'subject', 'message']

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.reply and 'reply' in form.changed_data and obj.owner:
            notify(obj.owner, 'Support has replied', f'Ticket: {obj.subject}\n{obj.reply}')


for model in [Wallet, LedgerEntry, Report, Document, PaymentCallback, Subscription, ReferralReward, AuditLog, LogEntry, PromoRedemption]:
    admin.site.register(model, ReadOnlyAdmin)
for model in [ServicePrice, CreditPackage, Provider, SiteSetting, PromoCode]:
    admin.site.register(model, AuditedAdmin)
admin.site.register(Notification, ReadOnlyAdmin)
admin.site.register(CreditTransfer, ReadOnlyAdmin)
admin.site.site_header = 'CheckWise AI administration'
admin.site.site_title = 'CheckWise AI'
