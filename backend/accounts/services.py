from accounts.models import Account, Workspace


def provision_account(*, supabase_user_id: str, email: str = "") -> Account:
    """Create the local Account and its workspace on first authenticated request."""
    account, _created = Account.objects.get_or_create(
        supabase_user_id=supabase_user_id,
        defaults={"email": email},
    )
    if email and account.email != email:
        account.email = email
        account.save(update_fields=["email", "updated_at"])

    Workspace.objects.get_or_create(
        account=account,
        defaults={"name": "My Workspace"},
    )

    return Account.objects.select_related("workspace").get(pk=account.pk)
