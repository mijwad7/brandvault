import uuid

from django.db import models


class Account(models.Model):
    """Local identity mapped from a verified Supabase Auth user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supabase_user_id = models.UUIDField(unique=True)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.email or str(self.supabase_user_id)

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False


class Workspace(models.Model):
    """Single workspace owned by one account. No switcher in this assignment."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.OneToOneField(
        Account,
        on_delete=models.CASCADE,
        related_name="workspace",
    )
    name = models.CharField(max_length=120, default="My Workspace")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name
