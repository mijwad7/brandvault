from django.contrib import admin

from library.models import Activity, Asset, Folder


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("action", "subject_name", "actor_email", "workspace", "created_at")
    list_filter = ("action", "workspace")
    readonly_fields = ("id", "workspace", "action", "subject_name", "actor_email", "created_at")


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "parent", "updated_at")
    list_filter = ("workspace",)
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "workspace", "folder", "deleted_at", "updated_at")
    list_filter = ("type", "workspace")
    readonly_fields = ("id", "created_at", "updated_at")
