from django.urls import path

from brands.views import BrandView

urlpatterns = [
    path("brand", BrandView.as_view(), name="brand"),
]
