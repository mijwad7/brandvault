from django.contrib import admin

from library.models import Asset, Folder


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
