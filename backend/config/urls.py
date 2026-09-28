from django.contrib import admin
from django.urls import include, path
from drf_spectacular.utils import extend_schema
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses={200: {"type": "object", "properties": {"status": {"type": "string"}}}})
    def get(self, request):
        return Response({"status": "ok"})


_public = {"authentication_classes": [], "permission_classes": [AllowAny]}

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", HealthView.as_view(), name="health"),
    path("api/schema", SpectacularAPIView.as_view(**_public), name="schema"),
    path(
        "api/docs",
        SpectacularSwaggerView.as_view(url_name="schema", **_public),
        name="swagger-ui",
    ),
    path("api/", include("accounts.urls")),
    path("api/", include("brands.urls")),
    path("api/", include("library.urls")),
]
