"""Gemini tagging. The API key never leaves the backend. Nothing is saved here."""

from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parents[2] / "prompts" / "asset-tagging.md"
SUGGESTION_KEYS = ("tags", "description", "usage_suggestion")
MIN_TAGS = 3
MAX_TAGS = 8
MAX_TAG_LENGTH = 40
MAX_TEXT_LENGTH = 500

SUGGESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "tags": {
            "type": "array",
            "minItems": MIN_TAGS,
            "maxItems": MAX_TAGS,
            "items": {"type": "string"},
        },
        "description": {"type": "string"},
        "usage_suggestion": {"type": "string"},
    },
    "required": list(SUGGESTION_KEYS),
}


class AIError(Exception):
    pass


class AINotConfigured(AIError):
    pass


class AIInvalidResponse(AIError):
    pass


def get_gemini_client():
    if not settings.GEMINI_API_KEY:
        raise AINotConfigured(
            "AI tagging is not configured. Set GEMINI_API_KEY to enable it."
        )
    from google import genai

    return genai.Client(api_key=settings.GEMINI_API_KEY)


def redact_secret(message: str) -> str:
    key = settings.GEMINI_API_KEY or ""
    if key and key in message:
        return message.replace(key, "[redacted]")
    return message


def normalize_suggestion(payload) -> dict:
    """Return a clean suggestion dict, or raise ValueError."""
    if not isinstance(payload, dict):
        raise ValueError("Suggestion must be an object with tags, description, and usage_suggestion.")
    extra = set(payload) - set(SUGGESTION_KEYS)
    missing = [key for key in SUGGESTION_KEYS if key not in payload]
    if extra or missing:
        raise ValueError("Suggestion must contain only tags, description, and usage_suggestion.")

    raw_tags = payload["tags"]
    if not isinstance(raw_tags, list):
        raise ValueError("Tags must be a list of 3 to 8 short lowercase strings.")

    tags: list[str] = []
    seen: set[str] = set()
    for tag in raw_tags:
        if not isinstance(tag, str):
            raise ValueError("Tags must be a list of 3 to 8 short lowercase strings.")
        cleaned = " ".join(tag.strip().casefold().split())
        if not cleaned or len(cleaned) > MAX_TAG_LENGTH:
            raise ValueError("Each tag must be a short lowercase string.")
        if cleaned in seen:
            continue
        seen.add(cleaned)
        tags.append(cleaned)

    if not MIN_TAGS <= len(tags) <= MAX_TAGS:
        raise ValueError("Tags must be 3 to 8 short lowercase strings.")

    return {
        "tags": tags,
        "description": _sentence(payload["description"], "Description"),
        "usage_suggestion": _sentence(payload["usage_suggestion"], "Usage suggestion"),
    }


def suggest_asset_tags(asset, brand=None) -> dict:
    """Ask Gemini for tags. The caller must not persist this result."""
    client = get_gemini_client()
    from google.genai import types

    try:
        response = _generate_json(
            client,
            contents=build_tagging_prompt(asset, brand),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=SUGGESTION_SCHEMA,
            ),
        )
    except AIError:
        raise
    except Exception as exc:
        logger.warning("Gemini tagging request failed: %s", redact_secret(str(exc)))
        raise AIError("Gemini could not generate tags. Try again.") from exc

    raw = getattr(response, "text", None) or ""
    try:
        payload = json.loads(_strip_json(raw))
    except json.JSONDecodeError as exc:
        raise AIInvalidResponse("Gemini did not return JSON.") from exc

    try:
        return normalize_suggestion(payload)
    except ValueError as exc:
        raise AIInvalidResponse(str(exc)) from exc


def build_tagging_prompt(asset, brand=None) -> str:
    template = PROMPT_PATH.read_text(encoding="utf-8")
    head = template.split("## Input", 1)[0].rstrip()
    folder_name = ""
    if getattr(asset, "folder_id", None) and getattr(asset, "folder", None) is not None:
        folder_name = asset.folder.name or ""
    lines = [
        "## Input",
        f"- Asset name: {asset.name}",
        f"- Asset type: {asset.type}",
        f"- Asset URL: {asset.url or ''}",
        f"- Folder name (optional): {folder_name}",
        f"- Brand name (optional): {getattr(brand, 'name', '') if brand else ''}",
        f"- Primary color (optional): {getattr(brand, 'primary_color', '') if brand else ''}",
        f"- Secondary color (optional): {getattr(brand, 'secondary_color', '') if brand else ''}",
    ]
    return head + "\n\n" + "\n".join(lines) + "\n"


def _generate_json(client, *, contents: str, config):
    """Retry while Gemini reports a temporary overload. Keep the configured model."""
    from google.genai.errors import APIError

    delays = (1.0, 2.0)
    attempt = 0
    while True:
        try:
            return client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=config,
            )
        except APIError as exc:
            busy = exc.code in {429, 500, 503, 504} or (exc.status or "") in {
                "UNAVAILABLE",
                "RESOURCE_EXHAUSTED",
            }
            if not busy or attempt >= len(delays):
                logger.warning(
                    "Gemini tagging request failed: %s", redact_secret(str(exc))
                )
                if busy:
                    raise AIError(
                        "Gemini is busy right now. Try again in a moment."
                    ) from exc
                raise AIError("Gemini could not generate tags. Try again.") from exc
            time.sleep(delays[attempt])
            attempt += 1


def smoke_gemini() -> str:
    """Tiny generateContent call. Returns response text. Does not persist anything."""
    client = get_gemini_client()
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents="Reply with the single word ok.",
    )
    return (getattr(response, "text", None) or "").strip()


def _sentence(value, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label} must be one short sentence.")
    text = " ".join(value.strip().split())
    if not text or len(text) > MAX_TEXT_LENGTH:
        raise ValueError(f"{label} must be one short sentence.")
    return text


def _strip_json(raw: str) -> str:
    text = raw.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", text, flags=re.DOTALL)
    if fenced:
        return fenced.group(1).strip()
    return text
