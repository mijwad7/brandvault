import uuid

from django.core.exceptions import ValidationError
from django.db import models

from accounts.models import Workspace


class Activity(models.Model):
    """Workspace history. Written by the API, never by the client."""

    class Action(models.TextChoices):
        ASSET_CREATED = "asset.created", "Asset created"
        ASSET_UPDATED = "asset.updated", "Asset updated"
        ASSET_MOVED = "asset.moved", "Asset moved"
        ASSET_TRASHED = "asset.trashed", "Asset trashed"
        ASSET_RESTORED = "asset.restored", "Asset restored"
        ASSET_TAGS_SAVED = "asset.ai_tags_saved", "Asset tags saved"
        FOLDER_CREATED = "folder.created", "Folder created"
        FOLDER_DELETED = "folder.deleted", "Folder deleted"
        BRAND_CREATED = "brand.created", "Brand created"
        BRAND_UPDATED = "brand.updated", "Brand updated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    action = models.CharField(max_length=40, choices=Action.choices)
    subject_name = models.CharField(max_length=200)
    actor_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.subject_name}"


MAX_FOLDER_DEPTH = 3


class Folder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="folders",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )
    name = models.CharField(max_length=160)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "name"],
                condition=models.Q(parent__isnull=True),
                name="unique_root_folder_name",
            ),
            models.UniqueConstraint(
                fields=["workspace", "parent", "name"],
                condition=models.Q(parent__isnull=False),
                name="unique_child_folder_name",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class AssetQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def trashed(self):
        return self.filter(deleted_at__isnull=False)


class Asset(models.Model):
    class Type(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        LOGO = "logo", "Logo"
        DOCUMENT = "document", "Document"
        FONT = "font", "Font"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="assets",
    )
    folder = models.ForeignKey(
        Folder,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="assets",
    )
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=Type.choices)
    url = models.URLField(max_length=2000, blank=True)
    storage_bucket = models.CharField(max_length=120, blank=True)
    storage_path = models.CharField(max_length=500, blank=True)
    tags = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    usage_suggestion = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = AssetQuerySet.as_manager()

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["workspace", "deleted_at"]),
            models.Index(fields=["workspace", "folder"]),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def source(self) -> str:
        return "upload" if self.storage_path else "url"

    def clean(self):
        if not self.url and not self.storage_path:
            raise ValidationError("Add a file or a link.")
        if not isinstance(self.tags, list) or not all(
            isinstance(tag, str) for tag in self.tags
        ):
            raise ValidationError({"tags": "Tags must be a list of strings."})
