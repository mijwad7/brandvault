from django.contrib import admin

from brands.models import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "updated_at")
    readonly_fields = ("id", "created_at", "updated_at")
