from __future__ import annotations

from functools import lru_cache

import jwt
from django.conf import settings
from jwt import PyJWKClient
from rest_framework.exceptions import AuthenticationFailed

ALLOWED_ASYMMETRIC_ALGORITHMS = ("ES256", "RS256")


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    return PyJWKClient(f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json")


def _common_decode_options() -> dict:
    options = {"require": ["exp", "sub"]}
    return options


def verify_supabase_token(token: str) -> dict:
    """Verify a Supabase access token. Fails closed when auth is not configured."""
    if not settings.SUPABASE_JWT_SECRET and not settings.SUPABASE_URL:
        raise AuthenticationFailed("Supabase authentication is not configured.")

    try:
        if settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options=_common_decode_options(),
            )
        else:
            signing_key = _jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=list(ALLOWED_ASYMMETRIC_ALGORITHMS),
                audience="authenticated",
                options=_common_decode_options(),
            )
    except AuthenticationFailed:
        raise
    except jwt.ExpiredSignatureError as exc:
        raise AuthenticationFailed("Token has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthenticationFailed("Invalid authentication token.") from exc

    if payload.get("role") != "authenticated":
        raise AuthenticationFailed("Token is not an authenticated user token.")
    if not payload.get("sub"):
        raise AuthenticationFailed("Token is missing a subject.")
    return payload
