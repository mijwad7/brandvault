import uuid

import pytest
from rest_framework.test import APIClient

from accounts.models import Account, Workspace
from library.models import Asset


def make_account(email: str) -> Account:
    account = Account.objects.create(supabase_user_id=uuid.uuid4(), email=email)
    Workspace.objects.create(account=account, name="My Workspace")
    return account


def auth_client(account: Account) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=account)
    return client


@pytest.mark.django_db
def test_trash_writes_activity_for_that_workspace_only():
    owner = make_account("owner@brandvault.dev")
    other = make_account("other@brandvault.dev")
    asset = Asset.objects.create(
        workspace=owner.workspace,
        name="Hero",
        type=Asset.Type.IMAGE,
        url="https://example.com/hero.png",
    )

    trashed = auth_client(owner).post(f"/api/assets/{asset.id}/trash")
    assert trashed.status_code == 200

    own = auth_client(owner).get("/api/activity")
    assert own.status_code == 200
    assert own.data[0]["action"] == "asset.trashed"
    assert own.data[0]["summary"] == "Asset “Hero” trashed by owner@brandvault.dev"

    theirs = auth_client(other).get("/api/activity")
    assert theirs.status_code == 200
    assert theirs.data == []


@pytest.mark.django_db
def test_activity_requires_authentication():
    response = APIClient().get("/api/activity")
    assert response.status_code == 401


@pytest.mark.django_db
def test_folder_create_and_delete_are_logged_newest_first():
    account = make_account("owner@brandvault.dev")
    client = auth_client(account)
    created = client.post("/api/folders", {"name": "Campaigns"}, format="json")
    assert created.status_code == 201
    deleted = client.delete(f"/api/folders/{created.data['id']}")
    assert deleted.status_code == 204

    log = client.get("/api/activity")
    assert [item["action"] for item in log.data] == ["folder.deleted", "folder.created"]
    assert log.data[0]["summary"] == "Folder “Campaigns” deleted by owner@brandvault.dev"
