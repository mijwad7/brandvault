"""Gemini lives here later. The API key never leaves the backend."""

from django.conf import settings


class AINotImplemented(Exception):
    pass


def suggest_asset_tags(asset, brand=None) -> dict:
    """
    Will send asset + brand facts to Gemini and return:
    { "tags": [...], "description": "...", "usage_suggestion": "..." }

    The model response must be validated before it is returned to the client.
    Nothing is persisted here. Saving is a separate user-reviewed step.
    """
    if not settings.GEMINI_API_KEY:
        raise AINotImplemented(
            "AI tagging is not configured. Set GEMINI_API_KEY to enable it."
        )
    raise AINotImplemented("Gemini tagging is not implemented yet.")
