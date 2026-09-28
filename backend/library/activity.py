from library.models import Activity

_SENTENCES = {
    Activity.Action.ASSET_CREATED: "Asset “{name}” added by {actor}",
    Activity.Action.ASSET_UPDATED: "Asset “{name}” updated by {actor}",
    Activity.Action.ASSET_MOVED: "Asset “{name}” moved by {actor}",
    Activity.Action.ASSET_TRASHED: "Asset “{name}” trashed by {actor}",
    Activity.Action.ASSET_RESTORED: "Asset “{name}” restored by {actor}",
    Activity.Action.ASSET_DELETED: "Asset “{name}” permanently deleted by {actor}",
    Activity.Action.ASSET_TAGS_SAVED: "Asset “{name}” tags saved by {actor}",
    Activity.Action.FOLDER_CREATED: "Folder “{name}” created by {actor}",
    Activity.Action.FOLDER_DELETED: "Folder “{name}” deleted by {actor}",
    Activity.Action.BRAND_CREATED: "Brand “{name}” created by {actor}",
    Activity.Action.BRAND_UPDATED: "Brand “{name}” updated by {actor}",
}


def record_activity(*, workspace, action: str, subject_name: str, actor_email: str = "") -> Activity:
    return Activity.objects.create(
        workspace=workspace,
        action=action,
        subject_name=(subject_name or "")[:200],
        actor_email=actor_email or "",
    )


def activity_summary(activity: Activity) -> str:
    actor = activity.actor_email or "someone"
    template = _SENTENCES.get(activity.action, "{name} changed by {actor}")
    return template.format(name=activity.subject_name, actor=actor)
