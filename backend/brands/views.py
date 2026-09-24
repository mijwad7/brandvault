from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from brands.models import Brand
from brands.serializers import BrandSerializer
from integrations.webhooks import emit_after_commit


def _brand_for(workspace):
    try:
        return workspace.brand
    except Brand.DoesNotExist:
        return None


class BrandView(APIView):
    def get(self, request):
        brand = _brand_for(request.user.workspace)
        if brand is None:
            return Response({"detail": "Brand not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BrandSerializer(brand).data)

    def post(self, request):
        if _brand_for(request.user.workspace) is not None:
            return Response(
                {"detail": "Brand already exists. Use PATCH to update it."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = BrandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(workspace=request.user.workspace)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        brand = _brand_for(request.user.workspace)
        if brand is None:
            return Response({"detail": "Brand not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = BrandSerializer(brand, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        emit_after_commit(
            "brand.updated",
            {
                "brand_id": str(brand.id),
                "user_email": request.user.email,
            },
        )
        return Response(serializer.data)
