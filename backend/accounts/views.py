from django.conf import settings
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from library.services import workspace_storage_prefix


class MeView(APIView):
    @extend_schema(
        responses=inline_serializer(
            "Session",
            fields={
                "email": serializers.EmailField(),
                "workspace_id": serializers.UUIDField(),
                "supabase_user_id": serializers.UUIDField(),
                "storage_bucket": serializers.CharField(),
                "storage_prefix": serializers.CharField(),
            },
        )
    )
    def get(self, request):
        account = request.user
        uid = str(account.supabase_user_id)
        return Response(
            {
                "email": account.email,
                "workspace_id": str(account.workspace.id),
                "supabase_user_id": uid,
                "storage_bucket": settings.SUPABASE_STORAGE_BUCKET,
                "storage_prefix": workspace_storage_prefix(uid),
            }
        )
