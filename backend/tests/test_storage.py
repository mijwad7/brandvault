import uuid

import pytest
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from accounts.models import Account, Workspace
from library.models import Asset
from library.services import safe_storage_filename, validate_storage_path, workspace_storage_prefix


def make_account(email: str) -> Account:
    account = Account.objects.create(supabase_user_id=uuid.uuid4(), email=email)
    Workspace.objects.create(account=account, name="My Workspace")
    return account


def auth_client(account: Account) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=account)
    return client


def test_safe_storage_filename_strips_path_and_spaces():
    assert safe_storage_filename(r"..\Hero Image.PNG") == "Hero_Image.png"


def test_storage_path_must_use_supabase_user_prefix():
    uid = uuid.uuid4()
    validate_storage_path(
        supabase_user_id=uid,
        storage_path=f"{workspace_storage_prefix(uid)}assets/{uuid.uuid4()}/a.png",
    )
    with pytest.raises(ValidationError):
        validate_storage_path(
            supabase_user_id=uid,
            storage_path=f"workspaces/{uuid.uuid4()}/assets/{uuid.uuid4()}/a.png",
        )
    with pytest.raises(ValidationError):
        validate_storage_path(
            supabase_user_id=uid,
            storage_path=f"{workspace_storage_prefix(uid)}../other/a.png",
        )


@pytest.mark.django_db
def test_me_returns_workspace_and_storage_prefix():
    account = make_account("demo@brandvault.dev")
    response = auth_client(account).get("/api/me")
    assert response.status_code == 200
    assert response.data["email"] == "demo@brandvault.dev"
    assert response.data["workspace_id"] == str(account.workspace.id)
    assert response.data["supabase_user_id"] == str(account.supabase_user_id)
    assert response.data["storage_prefix"] == workspace_storage_prefix(account.supabase_user_id)


@pytest.mark.django_db
def test_create_upload_mints_storage_path_and_url_asset_stays_a_link():
    account = make_account("demo@brandvault.dev")
    client = auth_client(account)
    uploaded = client.post(
        "/api/assets",
        {"name": "Hero", "type": "image", "filename": "Hero Image.png", "content_type": "image/png"},
        format="json",
    )
    assert uploaded.status_code == 201
    asset_id = uploaded.data["id"]
    assert uploaded.data["url"] == ""
    assert uploaded.data["source"] == "upload"
    assert uploaded.data["storage_bucket"]
    assert (
        uploaded.data["storage_path"]
        == f"workspaces/{account.supabase_user_id}/assets/{asset_id}/Hero_Image.png"
    )

    linked = client.post(
        "/api/assets",
        {"name": "Remote", "type": "image", "url": "https://example.com/remote.png"},
        format="json",
    )
    assert linked.status_code == 201
    assert linked.data["source"] == "url"
    assert linked.data["storage_path"] == ""

    patched = client.patch(
        f"/api/assets/{asset_id}",
        {"url": "https://example.supabase.co/storage/v1/object/public/assets/hero.png"},
        format="json",
    )
    assert patched.status_code == 200
    assert patched.data["storage_path"].endswith("/Hero_Image.png")


@pytest.mark.django_db
def test_client_cannot_set_another_storage_path():
    owner = make_account("owner@brandvault.dev")
    other = make_account("other@brandvault.dev")
    asset = Asset.objects.create(
        workspace=owner.workspace,
        name="Owned",
        type="image",
        url="https://example.com/owned.png",
    )
    forged = f"workspaces/{other.supabase_user_id}/assets/{asset.id}/nope.png"

    owner_response = auth_client(owner).patch(
        f"/api/assets/{asset.id}",
        {"storage_path": forged},
        format="json",
    )
    assert owner_response.status_code == 400

    other_response = auth_client(other).patch(
        f"/api/assets/{asset.id}",
        {"storage_path": forged, "url": "https://example.com/stolen.png"},
        format="json",
    )
    assert other_response.status_code == 404
    asset.refresh_from_db()
    assert asset.storage_path == ""
    assert asset.url == "https://example.com/owned.png"
