from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import ValidationError as APIValidationError

from library.models import Asset, Folder
from library.services import (
    build_asset_storage_path,
    safe_storage_filename,
    validate_asset_folder,
    validate_folder_parent,
    validate_storage_path,
)


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ("id", "name", "parent", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_parent(self, parent):
        workspace = self.context["request"].user.workspace
        validate_folder_parent(
            workspace=workspace,
            folder=self.instance,
            parent=parent,
        )
        return parent


class AssetSerializer(serializers.ModelSerializer):
    source = serializers.CharField(read_only=True)
    filename = serializers.CharField(
        required=False, write_only=True, allow_blank=False, max_length=240
    )
    content_type = serializers.CharField(
        required=False, write_only=True, allow_blank=True, max_length=200
    )
    clear_storage = serializers.BooleanField(required=False, write_only=True)

    class Meta:
        model = Asset
        fields = (
            "id",
            "name",
            "type",
            "url",
            "storage_bucket",
            "storage_path",
            "source",
            "folder",
            "tags",
            "description",
            "usage_suggestion",
            "created_at",
            "updated_at",
            "deleted_at",
            "filename",
            "content_type",
            "clear_storage",
        )
        read_only_fields = ("id", "source", "created_at", "updated_at", "deleted_at")

    def validate_folder(self, folder):
        validate_asset_folder(
            workspace=self.context["request"].user.workspace,
            folder=folder,
        )
        return folder

    def validate_storage_path(self, storage_path):
        account = self.context["request"].user
        if self.instance is None:
            if storage_path:
                raise serializers.ValidationError("storage_path is set by the server.")
            return storage_path
        current = self.instance.storage_path or ""
        if (storage_path or "") != current:
            raise serializers.ValidationError(
                "storage_path is set by the server and cannot be changed."
            )
        validate_storage_path(
            supabase_user_id=account.supabase_user_id,
            storage_path=storage_path,
        )
        return storage_path

    def validate_storage_bucket(self, storage_bucket):
        if self.instance is None:
            if storage_bucket:
                raise serializers.ValidationError("storage_bucket is set by the server.")
            return storage_bucket
        current = self.instance.storage_bucket or ""
        if (storage_bucket or "") != current:
            raise serializers.ValidationError(
                "storage_bucket is set by the server and cannot be changed."
            )
        return storage_bucket

    def validate_url(self, value):
        if value and not value.startswith("https://"):
            raise serializers.ValidationError("URL must use HTTPS.")
        return value

    def validate_filename(self, filename):
        try:
            return safe_storage_filename(filename)
        except APIValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict):
                message = detail.get("filename", "Enter a file name.")
                if isinstance(message, list):
                    message = message[0]
                raise serializers.ValidationError(str(message))
            raise serializers.ValidationError(str(detail))

    def validate_tags(self, tags):
        if tags is None:
            return []
        if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
            raise serializers.ValidationError("Tags must be a list of strings.")
        return tags

    def validate(self, attrs):
        filename = attrs.get("filename") or ""
        clear_storage = bool(attrs.get("clear_storage"))
        if filename and clear_storage:
            raise serializers.ValidationError(
                "Provide a file or clear storage, not both."
            )
        if filename and attrs.get("url"):
            raise serializers.ValidationError("Provide a file or a URL, not both.")

        if self.instance is None:
            url = attrs.get("url") or ""
            if not url and not filename:
                raise serializers.ValidationError(
                    "An asset must have a URL or a storage_path."
                )
            return attrs

        url = attrs.get("url", self.instance.url or "")
        storage_path = self.instance.storage_path or ""
        if clear_storage:
            storage_path = ""
        if filename and not self.instance.storage_path:
            storage_path = "pending"
        if not url and not storage_path:
            raise serializers.ValidationError(
                "An asset must have a URL or a storage_path."
            )
        return attrs

    def create(self, validated_data):
        filename = validated_data.pop("filename", None)
        validated_data.pop("content_type", None)
        validated_data.pop("clear_storage", None)
        validated_data.pop("storage_path", None)
        validated_data.pop("storage_bucket", None)
        asset = Asset(**validated_data)
        if filename:
            account = self.context["request"].user
            asset.url = ""
            asset.storage_bucket = settings.SUPABASE_STORAGE_BUCKET
            asset.storage_path = build_asset_storage_path(
                supabase_user_id=account.supabase_user_id,
                asset_id=asset.id,
                filename=filename,
            )
            validate_storage_path(
                supabase_user_id=account.supabase_user_id,
                storage_path=asset.storage_path,
            )
        asset.save()
        return asset

    def update(self, instance, validated_data):
        filename = validated_data.pop("filename", None)
        clear_storage = validated_data.pop("clear_storage", False)
        validated_data.pop("content_type", None)
        validated_data.pop("storage_path", None)
        validated_data.pop("storage_bucket", None)
        if clear_storage:
            instance.storage_bucket = ""
            instance.storage_path = ""
        elif filename and not instance.storage_path:
            account = self.context["request"].user
            instance.storage_bucket = settings.SUPABASE_STORAGE_BUCKET
            instance.storage_path = build_asset_storage_path(
                supabase_user_id=account.supabase_user_id,
                asset_id=instance.id,
                filename=filename,
            )
            validate_storage_path(
                supabase_user_id=account.supabase_user_id,
                storage_path=instance.storage_path,
            )
        return super().update(instance, validated_data)
