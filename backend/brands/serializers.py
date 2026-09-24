from rest_framework import serializers

from brands.models import Brand


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = (
            "id",
            "name",
            "primary_color",
            "secondary_color",
            "logo_url",
            "default_font",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_logo_url(self, value):
        if value and not value.startswith("https://"):
            raise serializers.ValidationError("Logo URL must use HTTPS.")
        return value
