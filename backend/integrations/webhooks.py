"""Optional n8n notifications. Failures must never roll back a user action."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)


def emit(event: str, payload: dict) -> None:
    url = settings.N8N_WEBHOOK_URL
    if not url:
        return

    body = {
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    request = Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5):
            pass
    except (URLError, TimeoutError, OSError):
        logger.exception("n8n webhook failed for event %s", event)


def emit_after_commit(event: str, payload: dict) -> None:
    transaction.on_commit(lambda: emit(event, payload))
