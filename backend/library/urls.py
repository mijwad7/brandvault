from rest_framework.routers import SimpleRouter

from library.views import AssetViewSet, FolderViewSet

router = SimpleRouter(trailing_slash=False)
router.register("folders", FolderViewSet, basename="folder")
router.register("assets", AssetViewSet, basename="asset")

urlpatterns = router.urls
