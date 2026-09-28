from accounts.models import Account, Workspace


def provision_account(*, supabase_user_id: str, email: str = "") -> Account:
    """Return the local Account, creating it and its workspace on first sign-in.

    Runs on every authenticated request. The steady path is one SELECT.
    """
    account = (
        Account.objects.select_related("workspace")
        .filter(supabase_user_id=supabase_user_id)
        .first()
    )
    if account is not None and _workspace_loaded(account):
        if email and account.email != email:
            account.email = email
            account.save(update_fields=["email", "updated_at"])
        return account

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


def _workspace_loaded(account: Account) -> bool:
    try:
        account.workspace
    except Workspace.DoesNotExist:
        return False
    return True
