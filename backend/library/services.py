from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.exceptions import APIException

from library.models import MAX_FOLDER_DEPTH, Asset, Folder


class FolderNotEmpty(APIException):
    status_code = 409
    default_detail = "Folder is not empty. Move or delete its contents first."
    default_code = "folder_not_empty"


def folder_depth(folder: Folder | None) -> int:
    if folder is None:
        return 0
    depth = 1
    current = folder
    seen: set = set()
    while current.parent_id:
        if current.id in seen:
            raise ValidationError("Folder parent chain contains a cycle.")
        seen.add(current.id)
        current = current.parent
        depth += 1
    return depth


def subtree_height(folder: Folder) -> int:
    children = list(folder.children.all())
    if not children:
        return 1
    return 1 + max(subtree_height(child) for child in children)


def is_in_subtree(folder: Folder, other: Folder) -> bool:
    current = other
    seen: set = set()
    while current is not None:
        if current.id == folder.id:
            return True
        if current.id in seen:
            break
        seen.add(current.id)
        current = current.parent
    return False


def workspace_storage_prefix(workspace_id) -> str:
    return f"workspaces/{workspace_id}/"


def validate_folder_parent(*, workspace, folder: Folder | None, parent: Folder | None) -> None:
    if parent is None:
        return
    if parent.workspace_id != workspace.id:
        raise ValidationError({"parent": "Parent folder is not in this workspace."})
    if folder is not None and is_in_subtree(folder, parent):
        raise ValidationError({"parent": "A folder cannot be moved under itself."})

    extra = 1 if folder is None else subtree_height(folder)
    if folder_depth(parent) + extra > MAX_FOLDER_DEPTH:
        raise ValidationError(
            {"parent": f"Folders cannot be nested more than {MAX_FOLDER_DEPTH} levels."}
        )


def validate_asset_folder(*, workspace, folder: Folder | None) -> None:
    if folder is None:
        return
    if folder.workspace_id != workspace.id:
        raise ValidationError({"folder": "Folder is not in this workspace."})


def validate_storage_path(*, workspace, storage_path: str) -> None:
    if not storage_path:
        return
    prefix = workspace_storage_prefix(workspace.id)
    if not storage_path.startswith(prefix):
        raise ValidationError(
            {"storage_path": f"storage_path must start with {prefix}"}
        )


def assert_folder_empty(folder: Folder) -> None:
    if folder.children.exists() or folder.assets.exists():
        raise FolderNotEmpty()


def trash_asset(asset: Asset) -> Asset:
    if asset.deleted_at is not None:
        raise ValidationError("Asset is already in trash.")
    asset.deleted_at = timezone.now()
    asset.save(update_fields=["deleted_at", "updated_at"])
    return asset


def restore_asset(asset: Asset) -> Asset:
    if asset.deleted_at is None:
        raise ValidationError("Asset is not in trash.")
    asset.deleted_at = None
    asset.save(update_fields=["deleted_at", "updated_at"])
    return asset
