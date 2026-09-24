from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from accounts.jwt import verify_supabase_token
from accounts.services import provision_account


class SupabaseJWTAuthentication(BaseAuthentication):
    """Authenticate API requests with a Supabase-issued Bearer access token."""

    keyword = "Bearer"

    def authenticate(self, request):
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header:
            return None

        parts = header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            raise AuthenticationFailed("Authorization header must be: Bearer <token>.")

        payload = verify_supabase_token(parts[1])
        account = provision_account(
            supabase_user_id=payload["sub"],
            email=payload.get("email") or "",
        )
        return (account, payload)

    def authenticate_header(self, request):
        return self.keyword
