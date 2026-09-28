import uuid

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from accounts.models import Account, Workspace
from accounts.services import provision_account


@pytest.mark.django_db
def test_provision_creates_account_and_workspace_once():
    user_id = uuid.uuid4()
    created = provision_account(supabase_user_id=str(user_id), email="new@brandvault.dev")
    assert created.email == "new@brandvault.dev"
    assert created.workspace.name == "My Workspace"
    assert Account.objects.count() == 1
    assert Workspace.objects.count() == 1

    again = provision_account(supabase_user_id=str(user_id), email="new@brandvault.dev")
    assert again.pk == created.pk
    assert Account.objects.count() == 1


@pytest.mark.django_db
def test_provision_existing_account_is_one_query():
    user_id = uuid.uuid4()
    account = Account.objects.create(supabase_user_id=user_id, email="demo@brandvault.dev")
    Workspace.objects.create(account=account, name="My Workspace")

    with CaptureQueriesContext(connection) as ctx:
        loaded = provision_account(
            supabase_user_id=str(user_id),
            email="demo@brandvault.dev",
        )
        assert loaded.workspace.pk == account.workspace.pk

    assert len(ctx.captured_queries) == 1
