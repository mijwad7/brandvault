from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from brands.models import Brand
from integrations.ai import (
    AIError,
    AIInvalidResponse,
    AINotConfigured,
    normalize_suggestion,
    suggest_asset_tags,
)
from integrations.webhooks import emit_after_commit
from library.models import Asset, Folder
from library.serializers import AssetSerializer, FolderSerializer
from library.services import assert_folder_empty, restore_asset, trash_asset


class WorkspaceScopedMixin:
    workspace_field = "workspace"

    def get_workspace(self):
        return self.request.user.workspace

    def perform_create(self, serializer):
        serializer.save(workspace=self.get_workspace())


class FolderViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Folder.objects.filter(workspace=self.get_workspace()).select_related(
            "parent"
        )

    def perform_destroy(self, instance):
        assert_folder_empty(instance)
        instance.delete()


class AssetViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = Asset.objects.filter(workspace=self.get_workspace()).select_related(
            "folder"
        )
        if self.action == "list":
            if self.request.query_params.get("trashed") == "true":
                qs = qs.trashed()
            else:
                qs = qs.alive()
            folder = self.request.query_params.get("folder")
            if folder == "root":
                qs = qs.filter(folder__isnull=True)
            elif folder:
                qs = qs.filter(folder_id=folder)
            search = self.request.query_params.get("search")
            if search:
                qs = qs.filter(name__icontains=search)
            if self.request.query_params.get("sort") == "name_asc":
                qs = qs.order_by("name")
            else:
                qs = qs.order_by("-updated_at")
            return qs
        if self.action == "restore":
            return qs.trashed()
        if self.action in {"trash", "partial_update", "update"}:
            return qs.alive()
        return qs.alive()

    @action(detail=True, methods=["post"], url_path="trash")
    def trash(self, request, pk=None):
        asset = trash_asset(self.get_object())
        return Response(AssetSerializer(asset).data)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        asset = restore_asset(self.get_object())
        emit_after_commit(
            "asset.restored",
            {
                "asset_id": str(asset.id),
                "user_email": request.user.email,
            },
        )
        return Response(AssetSerializer(asset).data)

    @action(detail=True, methods=["post"], url_path="ai-tags")
    def ai_tags(self, request, pk=None):
        asset = self.get_object()
        brand = Brand.objects.filter(workspace_id=asset.workspace_id).first()
        try:
            suggestion = suggest_asset_tags(asset, brand=brand)
        except AINotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_501_NOT_IMPLEMENTED)
        except (AIInvalidResponse, AIError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(suggestion)

    @action(detail=True, methods=["patch"], url_path="ai-tags/save")
    def save_ai_tags(self, request, pk=None):
        asset = self.get_object()
        try:
            cleaned = normalize_suggestion(request.data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        asset.tags = cleaned["tags"]
        asset.description = cleaned["description"]
        asset.usage_suggestion = cleaned["usage_suggestion"]
        asset.save(
            update_fields=["tags", "description", "usage_suggestion", "updated_at"]
        )
        return Response(AssetSerializer(asset).data)
