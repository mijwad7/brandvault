from django.urls import path
from rest_framework.routers import SimpleRouter

from library.views import ActivityListView, AssetViewSet, FolderViewSet

router = SimpleRouter(trailing_slash=False)
router.register("folders", FolderViewSet, basename="folder")
router.register("assets", AssetViewSet, basename="asset")

urlpatterns = [
    path("activity", ActivityListView.as_view(), name="activity"),
    *router.urls,
]
