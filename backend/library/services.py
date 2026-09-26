import re

from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.exceptions import APIException

from library.models import MAX_FOLDER_DEPTH, Asset, Folder

_FILENAME_PART = re.compile(r"[^A-Za-z0-9_-]+")


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


def workspace_storage_prefix(supabase_user_id) -> str:
    """Storage object prefix scoped by the Supabase Auth user id.

    Storage RLS can read auth.uid(). It cannot read the Django workspace UUID.
    Asset and brand rows are still filtered by workspace in Postgres.
    """
    return f"workspaces/{supabase_user_id}/"


def safe_storage_filename(filename: str) -> str:
    raw = str(filename or "").replace("\\", "/").split("/")[-1].strip()
    if raw in {"", ".", ".."}:
        raise ValidationError({"filename": "Enter a file name."})
    stem, dot, ext = raw.rpartition(".")
    if not dot:
        stem, ext = raw, ""

    def clean(part: str) -> str:
        cleaned = _FILENAME_PART.sub("_", part)
        return re.sub(r"_+", "_", cleaned).strip("_")

    stem_clean = clean(stem)
    ext_clean = clean(ext).lower()
    if ext_clean:
        name = f"{stem_clean or 'file'}.{ext_clean}"
    else:
        name = stem_clean
    if not name:
        raise ValidationError({"filename": "Enter a file name."})
    return name[:180]


def build_asset_storage_path(*, supabase_user_id, asset_id, filename: str) -> str:
    safe = safe_storage_filename(filename)
    return f"{workspace_storage_prefix(supabase_user_id)}assets/{asset_id}/{safe}"


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


def validate_storage_path(*, supabase_user_id, storage_path: str) -> None:
    if not storage_path:
        return
    prefix = workspace_storage_prefix(supabase_user_id)
    parts = storage_path.split("/")
    if (
        not storage_path.startswith(prefix)
        or any(part in {"", ".", ".."} for part in parts)
    ):
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
