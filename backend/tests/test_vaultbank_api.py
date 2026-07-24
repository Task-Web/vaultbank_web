import pytest


@pytest.mark.asyncio
async def test_control_plane_is_hidden_from_public_openapi(async_client):
    schema = (await async_client.get("/api/openapi.json")).json()
    assert "/api/state" not in schema["paths"]
    assert all(tag.get("name") != "state" for tag in schema.get("tags", []))


async def _reset(async_client, cookie: str):
    response = await async_client.delete("/api/state", params={"cookie": cookie})
    assert response.status_code == 200
    return response.json()["state"]["data"]


@pytest.mark.asyncio
async def test_dashboard_is_product_projection(async_client):
    cookie = "vaultbank-dashboard"
    await _reset(async_client, cookie)

    response = await async_client.get(
        "/api/vaultbank/dashboard", params={"cookie": cookie}
    )

    assert response.status_code == 200
    assert set(response.json()["data"]) == {
        "accounts",
        "credit_cards",
        "loans",
        "investments",
        "bill_pay",
        "transfers",
        "user_profile",
        "mobile_deposits",
    }
    assert "state" not in response.json()
    assert "examples" not in response.json()["data"]
    assert "uploads" not in response.json()["data"]


@pytest.mark.asyncio
async def test_profile_update_is_strict_and_preserves_unrelated_state(async_client):
    cookie = "vaultbank-profile"
    await _reset(async_client, cookie)
    await async_client.patch(
        "/api/state",
        params={"cookie": cookie},
        json={"data": {"evaluator_marker": {"keep": True}}},
    )

    rejected = await async_client.patch(
        "/api/vaultbank/profile",
        params={"cookie": cookie},
        json={"first_name": "Ada", "evaluator_marker": False},
    )
    assert rejected.status_code == 422

    response = await async_client.patch(
        "/api/vaultbank/profile",
        params={"cookie": cookie},
        json={"first_name": "Ada"},
    )
    assert response.status_code == 200

    final = await async_client.get("/api/state", params={"cookie": cookie})
    data = final.json()["state"]["data"]
    assert data["user_profile"]["first_name"] == "Ada"
    assert data["evaluator_marker"] == {"keep": True}


@pytest.mark.asyncio
async def test_transfer_action_is_atomic_and_cookie_isolated(async_client):
    source_cookie = "vaultbank-transfer-source"
    other_cookie = "vaultbank-transfer-other"
    source = await _reset(async_client, source_cookie)
    other = await _reset(async_client, other_cookie)
    source_from, source_to = source["accounts"][:2]

    response = await async_client.post(
        "/api/transfer",
        params={"cookie": source_cookie},
        json={
            "from_account_id": source_from["id"],
            "to_account_id": source_to["id"],
            "amount": 1,
            "transfer_type": "internal",
        },
    )
    assert response.status_code == 200

    final = (
        await async_client.get("/api/state", params={"cookie": source_cookie})
    ).json()["state"]["data"]
    untouched = (
        await async_client.get("/api/state", params={"cookie": other_cookie})
    ).json()["state"]["data"]
    assert final["accounts"][0]["current_balance"] == pytest.approx(
        source_from["current_balance"] - 1
    )
    assert final["accounts"][1]["current_balance"] == pytest.approx(
        source_to["current_balance"] + 1
    )
    assert final["transfers"]["history"][-1]["date"]
    assert untouched["accounts"][0]["current_balance"] == other["accounts"][0][
        "current_balance"
    ]


@pytest.mark.asyncio
async def test_product_actions_reject_internal_fields_and_invalid_ids(async_client):
    cookie = "vaultbank-strict"
    state = await _reset(async_client, cookie)
    card_id = state["credit_cards"][0]["id"]
    account_id = state["accounts"][0]["id"]

    strict_requests = [
        ("PUT", f"/api/vaultbank/cards/{card_id}/freeze", {"frozen": True}),
        (
            "POST",
            f"/api/vaultbank/cards/{card_id}/payments",
            {"account_id": account_id, "amount": 1},
        ),
        (
            "POST",
            "/api/vaultbank/payees",
            {"name": "Water", "account_number": "123", "address": "One St"},
        ),
        (
            "POST",
            "/api/vaultbank/investments/brokerage/trades",
            {"symbol": "AAPL", "trade_type": "buy", "quantity": 1, "price": 1},
        ),
        (
            "POST",
            "/api/vaultbank/loans",
            {"loan_type": "auto", "amount": 1000, "term_months": 12},
        ),
        (
            "POST",
            f"/api/vaultbank/loans/{state['loans'][0]['id']}/payments",
            {"account_id": account_id, "amount": 1},
        ),
        (
            "POST",
            "/api/vaultbank/mobile-deposits",
            {
                "account_id": account_id,
                "amount": 1,
                "front_image": "front.jpg",
                "back_image": "back.jpg",
            },
        ),
    ]
    for method, path, body in strict_requests:
        response = await async_client.request(
            method,
            path,
            params={"cookie": cookie},
            json={**body, "developer_tools_open": True},
        )
        assert response.status_code == 422, path

    missing = await async_client.put(
        "/api/vaultbank/cards/missing/freeze",
        params={"cookie": cookie},
        json={"frozen": True},
    )
    assert missing.status_code == 404
