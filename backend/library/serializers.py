from rest_framework import serializers

from library.models import Asset, Folder
from library.services import (
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
        )
        read_only_fields = ("id", "source", "created_at", "updated_at", "deleted_at")

    def validate_folder(self, folder):
        validate_asset_folder(
            workspace=self.context["request"].user.workspace,
            folder=folder,
        )
        return folder

    def validate_storage_path(self, storage_path):
        validate_storage_path(
            workspace=self.context["request"].user.workspace,
            storage_path=storage_path,
        )
        return storage_path

    def validate_url(self, value):
        if value and not value.startswith("https://"):
            raise serializers.ValidationError("URL must use HTTPS.")
        return value

    def validate_tags(self, tags):
        if tags is None:
            return []
        if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
            raise serializers.ValidationError("Tags must be a list of strings.")
        return tags

    def validate(self, attrs):
        url = attrs.get("url", getattr(self.instance, "url", ""))
        storage_path = attrs.get(
            "storage_path", getattr(self.instance, "storage_path", "")
        )
        if not url and not storage_path:
            raise serializers.ValidationError(
                "An asset must have a URL or a storage_path."
            )
        return attrs
