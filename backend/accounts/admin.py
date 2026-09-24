from django.contrib import admin

from accounts.models import Account, Workspace


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("email", "supabase_user_id", "created_at")
    search_fields = ("email", "supabase_user_id")
    readonly_fields = ("id", "supabase_user_id", "created_at", "updated_at")


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("name", "account", "created_at")
    readonly_fields = ("id", "created_at", "updated_at")
