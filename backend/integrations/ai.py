"""Gemini client wiring. The API key never leaves the backend."""

from django.conf import settings


class AINotImplemented(Exception):
    pass


class AINotConfigured(AINotImplemented):
    pass


def get_gemini_client():
    if not settings.GEMINI_API_KEY:
        raise AINotConfigured(
            "AI tagging is not configured. Set GEMINI_API_KEY to enable it."
        )
    from google import genai

    return genai.Client(api_key=settings.GEMINI_API_KEY)


def suggest_asset_tags(asset, brand=None) -> dict:
    """
    Will send asset + brand facts to Gemini and return:
    { "tags": [...], "description": "...", "usage_suggestion": "..." }

    The model response must be validated before it is returned to the client.
    Nothing is persisted here. Saving is a separate user-reviewed step.
    """
    get_gemini_client()
    raise AINotImplemented("Gemini tagging is not implemented yet.")


def redact_secret(message: str) -> str:
    key = settings.GEMINI_API_KEY or ""
    if key and key in message:
        return message.replace(key, "[redacted]")
    return message


def smoke_gemini() -> str:
    """Tiny generateContent call. Returns response text. Does not persist anything."""
    client = get_gemini_client()
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents="Reply with the single word ok.",
    )
    return (getattr(response, "text", None) or "").strip()
