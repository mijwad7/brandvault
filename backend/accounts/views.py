from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from library.services import workspace_storage_prefix


class MeView(APIView):
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
