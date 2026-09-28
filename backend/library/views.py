from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from brands.models import Brand
from library.activity import record_activity
from integrations.ai import (
    AIError,
    AIInvalidResponse,
    AINotConfigured,
    normalize_suggestion,
    suggest_asset_tags,
)
from integrations.webhooks import emit_after_commit
from library.models import Activity, Asset, Folder
from library.serializers import ActivitySerializer, AssetSerializer, FolderSerializer
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

    def perform_create(self, serializer):
        with transaction.atomic():
            super().perform_create(serializer)
            record_activity(
                workspace=self.get_workspace(),
                action=Activity.Action.FOLDER_CREATED,
                subject_name=serializer.instance.name,
                actor_email=self.request.user.email,
            )

    def perform_destroy(self, instance):
        assert_folder_empty(instance)
        name = instance.name
        workspace = instance.workspace
        email = self.request.user.email
        with transaction.atomic():
            instance.delete()
            record_activity(
                workspace=workspace,
                action=Activity.Action.FOLDER_DELETED,
                subject_name=name,
                actor_email=email,
            )


class AssetViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        with transaction.atomic():
            super().perform_create(serializer)
            record_activity(
                workspace=self.get_workspace(),
                action=Activity.Action.ASSET_CREATED,
                subject_name=serializer.instance.name,
                actor_email=self.request.user.email,
            )

    def perform_update(self, serializer):
        previous_folder_id = serializer.instance.folder_id
        with transaction.atomic():
            super().perform_update(serializer)
            asset = serializer.instance
            action = (
                Activity.Action.ASSET_MOVED
                if asset.folder_id != previous_folder_id
                else Activity.Action.ASSET_UPDATED
            )
            record_activity(
                workspace=asset.workspace,
                action=action,
                subject_name=asset.name,
                actor_email=self.request.user.email,
            )

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
        with transaction.atomic():
            asset = trash_asset(self.get_object())
            record_activity(
                workspace=asset.workspace,
                action=Activity.Action.ASSET_TRASHED,
                subject_name=asset.name,
                actor_email=request.user.email,
            )
        return Response(AssetSerializer(asset).data)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        with transaction.atomic():
            asset = restore_asset(self.get_object())
            record_activity(
                workspace=asset.workspace,
                action=Activity.Action.ASSET_RESTORED,
                subject_name=asset.name,
                actor_email=request.user.email,
            )
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
        with transaction.atomic():
            asset.save(
                update_fields=["tags", "description", "usage_suggestion", "updated_at"]
            )
            record_activity(
                workspace=asset.workspace,
                action=Activity.Action.ASSET_TAGS_SAVED,
                subject_name=asset.name,
                actor_email=request.user.email,
            )
            emit_after_commit(
                "asset.ai_tags_saved",
                {
                    "asset_id": str(asset.id),
                    "user_email": request.user.email,
                },
            )
        return Response(AssetSerializer(asset).data)


class ActivityListView(APIView):
    def get(self, request):
        activities = Activity.objects.filter(workspace=request.user.workspace)[:50]
        return Response(ActivitySerializer(activities, many=True).data)
