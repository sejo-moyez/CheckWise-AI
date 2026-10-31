import uuid
import secrets
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


def referral_code():
    return secrets.token_hex(6)


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, role='superadmin', email_verified=True)
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=[(x, x.title()) for x in ['user', 'reseller', 'admin', 'superadmin']], default='user')
    email_verified = models.BooleanField(default=False)
    referral_code = models.CharField(max_length=12, unique=True, default=referral_code, editable=False)
    referred_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    reseller = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='customers')
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = UserManager()
