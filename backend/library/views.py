import uuid

from django.db import transaction
from django.db.models import Exists, OuterRef, Q, TextField
from django.db.models.functions import Cast
from drf_spectacular.utils import OpenApiParameter, extend_schema
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
from library.serializers import (
    ActivitySerializer,
    AssetSerializer,
    FolderSerializer,
    TagSuggestionSerializer,
)
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
        if getattr(self, "swagger_fake_view", False):
            return Folder.objects.none()
        children = Folder.objects.filter(parent_id=OuterRef("pk"))
        held_assets = Asset.objects.filter(folder_id=OuterRef("pk"))
        return (
            Folder.objects.filter(workspace=self.get_workspace())
            .select_related("parent")
            .annotate(
                _has_child=Exists(children),
                _has_asset=Exists(held_assets),
            )
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

    @extend_schema(
        description="Delete is refused with 409 while the folder has a child folder or any asset, including a trashed one."
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class AssetViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

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

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "folder",
                str,
                description="`root` for assets with no folder, or a folder id. Omit to list the whole library.",
            ),
            OpenApiParameter(
                "search",
                str,
                description="Matches name, description, and tags.",
            ),
            OpenApiParameter(
                "sort",
                str,
                enum=["updated_desc", "name_asc"],
                description="Default is updated_desc.",
            ),
            OpenApiParameter(
                "trashed",
                str,
                enum=["true"],
                description="Pass true to list trashed assets.",
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description="Permanently delete an asset that is already in trash. A live asset returns 404."
    )
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Asset.objects.none()
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
                try:
                    folder_id = uuid.UUID(folder)
                except ValueError:
                    return qs.none()
                qs = qs.filter(folder_id=folder_id)
            search = self.request.query_params.get("search")
            if search:
                qs = qs.annotate(_tags_text=Cast("tags", TextField())).filter(
                    Q(name__icontains=search)
                    | Q(description__icontains=search)
                    | Q(_tags_text__icontains=search)
                )
            if self.request.query_params.get("sort") == "name_asc":
                qs = qs.order_by("name")
            else:
                qs = qs.order_by("-updated_at")
            return qs
        if self.action in {"restore", "destroy"}:
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

    def perform_destroy(self, instance):
        name = instance.name
        workspace = instance.workspace
        email = self.request.user.email
        with transaction.atomic():
            instance.delete()
            record_activity(
                workspace=workspace,
                action=Activity.Action.ASSET_DELETED,
                subject_name=name,
                actor_email=email,
            )

    @extend_schema(
        request=None,
        responses={200: TagSuggestionSerializer},
        description="Ask Gemini for tags, a description, and a usage note. Nothing is saved.",
    )
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

    @extend_schema(
        request=TagSuggestionSerializer,
        responses=AssetSerializer,
        description="Store tags after the user reviews them. This is the only route that writes a suggestion.",
    )
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
    @extend_schema(responses=ActivitySerializer(many=True))
    def get(self, request):
        activities = Activity.objects.filter(workspace=request.user.workspace)[:50]
        return Response(ActivitySerializer(activities, many=True).data)
