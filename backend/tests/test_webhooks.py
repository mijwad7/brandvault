import json
import uuid
from urllib.error import URLError

import pytest
from rest_framework.test import APIClient

from accounts.models import Account, Workspace
from brands.models import Brand
from integrations.webhooks import emit
from library.models import Asset


def make_account(email: str) -> Account:
    account = Account.objects.create(supabase_user_id=uuid.uuid4(), email=email)
    Workspace.objects.create(account=account, name="My Workspace")
    return account


def auth_client(account: Account) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=account)
    return client


def make_asset(account: Account) -> Asset:
    return Asset.objects.create(
        workspace=account.workspace,
        name="Hero",
        type=Asset.Type.IMAGE,
        url="https://example.com/hero.png",
    )


class _QuietResponse:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def test_emit_does_nothing_when_url_is_empty(monkeypatch, settings):
    settings.N8N_WEBHOOK_URL = ""
    called = {"n": 0}

    def boom(*args, **kwargs):
        called["n"] += 1
        raise AssertionError("urlopen should not run")

    monkeypatch.setattr("integrations.webhooks.urlopen", boom)
    emit("asset.ai_tags_saved", {"asset_id": "1", "user_email": "a@b.c"})
    assert called["n"] == 0


def test_emit_swallows_url_errors(monkeypatch, settings):
    settings.N8N_WEBHOOK_URL = "https://example.invalid/webhook/brandvault"

    def boom(*args, **kwargs):
        raise URLError("n8n down")

    monkeypatch.setattr("integrations.webhooks.urlopen", boom)
    emit("asset.restored", {"asset_id": "1", "user_email": "a@b.c"})


def test_emit_posts_event_id_email_and_timestamp(monkeypatch, settings):
    settings.N8N_WEBHOOK_URL = "https://n8n.example/webhook/brandvault"
    captured = {}

    def fake_urlopen(request, timeout=5):
        captured["url"] = request.full_url
        captured["timeout"] = timeout
        captured["body"] = json.loads(request.data.decode())
        return _QuietResponse()

    monkeypatch.setattr("integrations.webhooks.urlopen", fake_urlopen)
    emit(
        "brand.updated",
        {"brand_id": "brand-1", "user_email": "demo@brandvault.dev"},
    )

    assert captured["url"] == "https://n8n.example/webhook/brandvault"
    assert captured["timeout"] == 5
    body = captured["body"]
    assert body["event"] == "brand.updated"
    assert body["brand_id"] == "brand-1"
    assert body["user_email"] == "demo@brandvault.dev"
    assert body["timestamp"]


@pytest.mark.django_db
def test_writes_succeed_when_webhook_url_is_empty(
    settings, monkeypatch, django_capture_on_commit_callbacks
):
    settings.N8N_WEBHOOK_URL = ""

    def boom(*args, **kwargs):
        raise AssertionError("urlopen")

    monkeypatch.setattr("integrations.webhooks.urlopen", boom)
    account = make_account("demo@brandvault.dev")
    client = auth_client(account)
    Brand.objects.create(workspace=account.workspace, name="Acme")
    asset = make_asset(account)
    client.post(f"/api/assets/{asset.id}/trash")

    with django_capture_on_commit_callbacks(execute=True):
        brand = client.patch("/api/brand", {"name": "Acme Co"}, format="json")
        restored = client.post(f"/api/assets/{asset.id}/restore")
        saved = client.patch(
            f"/api/assets/{asset.id}/ai-tags/save",
            {
                "tags": ["hero", "banner", "web"],
                "description": "A named image.",
                "usage_suggestion": "Use it on the homepage.",
            },
            format="json",
        )

    assert brand.status_code == 200
    assert restored.status_code == 200
    assert saved.status_code == 200
    assert saved.data["tags"] == ["hero", "banner", "web"]


@pytest.mark.django_db
def test_three_events_post_after_commit(
    settings, monkeypatch, django_capture_on_commit_callbacks
):
    settings.N8N_WEBHOOK_URL = "https://n8n.example/webhook/brandvault"
    bodies = []

    def fake_urlopen(request, timeout=5):
        bodies.append(json.loads(request.data.decode()))
        return _QuietResponse()

    monkeypatch.setattr("integrations.webhooks.urlopen", fake_urlopen)
    account = make_account("demo@brandvault.dev")
    client = auth_client(account)
    brand = Brand.objects.create(workspace=account.workspace, name="Acme")
    asset = make_asset(account)
    client.post(f"/api/assets/{asset.id}/trash")

    with django_capture_on_commit_callbacks(execute=True):
        assert client.patch("/api/brand", {"name": "Acme Co"}, format="json").status_code == 200
        assert client.post(f"/api/assets/{asset.id}/restore").status_code == 200
        assert (
            client.patch(
                f"/api/assets/{asset.id}/ai-tags/save",
                {
                    "tags": ["hero", "banner", "web"],
                    "description": "A named image.",
                    "usage_suggestion": "Use it on the homepage.",
                },
                format="json",
            ).status_code
            == 200
        )

    assert [body["event"] for body in bodies] == [
        "brand.updated",
        "asset.restored",
        "asset.ai_tags_saved",
    ]
    assert bodies[0]["brand_id"] == str(brand.id)
    assert bodies[1]["asset_id"] == str(asset.id)
    assert bodies[2]["asset_id"] == str(asset.id)
    assert all(body["user_email"] == "demo@brandvault.dev" for body in bodies)
    assert all(body["timestamp"] for body in bodies)
