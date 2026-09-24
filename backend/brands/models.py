import uuid

from django.core.validators import RegexValidator
from django.db import models

from accounts.models import Workspace

HEX_COLOR = RegexValidator(
    regex=r"^$|^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$",
    message="Enter a hex color like #AABBCC.",
)


class Brand(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(
        Workspace,
        on_delete=models.CASCADE,
        related_name="brand",
    )
    name = models.CharField(max_length=160)
    primary_color = models.CharField(max_length=7, blank=True, validators=[HEX_COLOR])
    secondary_color = models.CharField(max_length=7, blank=True, validators=[HEX_COLOR])
    logo_url = models.URLField(max_length=2000, blank=True)
    default_font = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name
