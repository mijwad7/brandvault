import json

import pytest

from integrations.ai import (
    AIInvalidResponse,
    AINotConfigured,
    build_tagging_prompt,
    normalize_suggestion,
    suggest_asset_tags,
)


class _Asset:
    name = "Hero banner"
    type = "image"
    url = "https://example.com/hero.png"
    folder_id = None
    folder = None


def test_normalize_suggestion_lowercases_and_drops_duplicates():
    cleaned = normalize_suggestion(
        {
            "tags": ["Hero", " hero ", "Banner", "Web"],
            "description": "  A named image. ",
            "usage_suggestion": "Use it on the homepage.",
        }
    )
    assert cleaned == {
        "tags": ["hero", "banner", "web"],
        "description": "A named image.",
        "usage_suggestion": "Use it on the homepage.",
    }


def test_normalize_suggestion_rejects_extra_keys():
    with pytest.raises(ValueError):
        normalize_suggestion(
            {
                "tags": ["a", "b", "c"],
                "description": "One.",
                "usage_suggestion": "Two.",
                "name": "nope",
            }
        )


def test_suggest_asset_tags_returns_validated_json(monkeypatch, settings):
    settings.GEMINI_API_KEY = "test-key"
    captured = {}

    class FakeResponse:
        text = json.dumps(
            {
                "tags": ["Hero", "Banner", "Homepage"],
                "description": "A named image asset.",
                "usage_suggestion": "Use it on a landing page.",
            }
        )

    class FakeModels:
        def generate_content(self, **kwargs):
            captured.update(kwargs)
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr("integrations.ai.get_gemini_client", lambda: FakeClient())

    result = suggest_asset_tags(_Asset(), brand=None)

    assert result["tags"] == ["hero", "banner", "homepage"]
    assert "Hero banner" in captured["contents"]
    assert captured["config"].response_mime_type == "application/json"


def test_suggest_asset_tags_rejects_invalid_model_json(monkeypatch, settings):
    settings.GEMINI_API_KEY = "test-key"

    class FakeResponse:
        text = '{"tags": ["only-one"], "description": "x", "usage_suggestion": "y"}'

    class FakeModels:
        def generate_content(self, **kwargs):
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr("integrations.ai.get_gemini_client", lambda: FakeClient())

    with pytest.raises(AIInvalidResponse):
        suggest_asset_tags(_Asset(), brand=None)


def test_missing_key_stops_before_a_request(settings):
    settings.GEMINI_API_KEY = ""
    with pytest.raises(AINotConfigured):
        suggest_asset_tags(_Asset())


def test_suggest_retries_when_gemini_is_busy(monkeypatch, settings):
    from google.genai.errors import APIError

    settings.GEMINI_API_KEY = "test-key"
    monkeypatch.setattr("integrations.ai.time.sleep", lambda _seconds: None)
    calls = {"count": 0}

    class FakeResponse:
        text = json.dumps(
            {
                "tags": ["hero", "banner", "web"],
                "description": "A named image.",
                "usage_suggestion": "Use it on the homepage.",
            }
        )

    class FakeModels:
        def generate_content(self, **kwargs):
            calls["count"] += 1
            if calls["count"] < 3:
                raise APIError(
                    503,
                    {
                        "error": {
                            "code": 503,
                            "message": "high demand",
                            "status": "UNAVAILABLE",
                        }
                    },
                )
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr("integrations.ai.get_gemini_client", lambda: FakeClient())
    result = suggest_asset_tags(_Asset(), brand=None)
    assert result["tags"] == ["hero", "banner", "web"]
    assert calls["count"] == 3


def test_prompt_includes_brand_facts():
    class Brand:
        name = "Northwind"
        primary_color = "#112233"
        secondary_color = ""

    prompt = build_tagging_prompt(_Asset(), brand=Brand())
    assert "Northwind" in prompt
    assert "#112233" in prompt
    assert "Do not invent facts" in prompt
