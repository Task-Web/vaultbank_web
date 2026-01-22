#!/usr/bin/env python3
"""
Test script to verify state persistence and user isolation.

Tests:
1. State persists across browser sessions via cookie
2. Different users have isolated state (different cookies)
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def create_test_user(cookie_name):
    """Create a new user by getting a cookie."""
    session = requests.Session()
    # First request will set a cookie
    response = session.get(f"{BASE_URL}/state")
    if response.status_code == 200:
        data = response.json()
        user_id = data.get("user_id")
        print(f"Created user: {user_id}")
        return session, user_id
    return None, None

def get_balances(session):
    """Get account balances from state."""
    response = session.get(f"{BASE_URL}/state")
    if response.status_code == 200:
        state = response.json()["state"]
        accounts = state["data"]["accounts"]
        balances = {}
        for acc in accounts:
            balances[acc["id"]] = {
                "nickname": acc["nickname"],
                "current": acc["current_balance"]
            }
        return balances
    return None

def make_transfer(session, from_id, to_id, amount):
    """Make a transfer between accounts."""
    # Get current state first
    response = session.get(f"{BASE_URL}/state")
    if response.status_code != 200:
        return False

    state = response.json()["state"]
    accounts = state["data"]["accounts"]

    # Update balances
    updated_accounts = []
    for acc in accounts:
        if acc["id"] == from_id:
            updated_accounts.append({
                **acc,
                "current_balance": acc["current_balance"] - amount,
                "available_balance": acc["available_balance"] - amount,
                "transactions": [
                    {
                        "id": f"tx_{int(time.time()*1000)}",
                        "date": time.strftime("%Y-%m-%dT%H:%M:%S"),
                        "description": f"Transfer to account",
                        "amount": -amount,
                        "running_balance": acc["current_balance"] - amount,
                        "category": "Transfer",
                        "type": "debit"
                    },
                    *(acc.get("transactions") or [])
                ]
            })
        elif acc["id"] == to_id:
            updated_accounts.append({
                **acc,
                "current_balance": acc["current_balance"] + amount,
                "available_balance": acc["available_balance"] + amount,
                "transactions": [
                    {
                        "id": f"tx_{int(time.time()*1000)+1}",
                        "date": time.strftime("%Y-%m-%dT%H:%M:%S"),
                        "description": f"Transfer from account",
                        "amount": amount,
                        "running_balance": acc["current_balance"] + amount,
                        "category": "Transfer",
                        "type": "credit"
                    },
                    *(acc.get("transactions") or [])
                ]
            })
        else:
            updated_accounts.append(acc)

    # Patch state
    patch_data = {
        "data": {
            "accounts": updated_accounts
        },
        "note": "Test transfer"
    }

    response = session.patch(f"{BASE_URL}/state", json=patch_data)
    return response.status_code == 200

def test_state_persistence():
    """Test that state persists across sessions for the same user."""
    print("\n=== Test 1: State Persistence Across Sessions ===")

    # Create user A
    print("\n1. Creating user A...")
    session_a, user_a = create_test_user("user_a")
    if not user_a:
        print("❌ Failed to create user A")
        return False

    # Get initial balances
    print("\n2. Getting initial balances for user A...")
    initial_balances_a = get_balances(session_a)
    print(f"   Initial balances: {json.dumps(initial_balances_a, indent=2)}")

    if not initial_balances_a or len(initial_balances_a) < 2:
        print("❌ User A doesn't have enough accounts")
        return False

    # Make a transfer
    account_ids = list(initial_balances_a.keys())
    from_acc = account_ids[0]
    to_acc = account_ids[1]
    transfer_amount = 100.0

    print(f"\n3. Making transfer of ${transfer_amount} from {initial_balances_a[from_acc]['nickname']} to {initial_balances_a[to_acc]['nickname']}...")
    if not make_transfer(session_a, from_acc, to_acc, transfer_amount):
        print("❌ Transfer failed")
        return False

    # Get new balances
    print("\n4. Getting balances after transfer...")
    new_balances_a = get_balances(session_a)
    print(f"   New balances: {json.dumps(new_balances_a, indent=2)}")

    # Verify transfer happened
    expected_from = initial_balances_a[from_acc]["current"] - transfer_amount
    expected_to = initial_balances_a[to_acc]["current"] + transfer_amount

    if abs(new_balances_a[from_acc]["current"] - expected_from) > 0.01:
        print(f"❌ From account balance incorrect: expected {expected_from}, got {new_balances_a[from_acc]['current']}")
        return False

    if abs(new_balances_a[to_acc]["current"] - expected_to) > 0.01:
        print(f"❌ To account balance incorrect: expected {expected_to}, got {new_balances_a[to_acc]['current']}")
        return False

    print("✅ Transfer successful and balances updated correctly")

    # Simulate "new session" by creating a new session with same cookie
    print("\n5. Creating new session with same cookie (simulating browser restart)...")
    session_a2 = requests.Session()
    # Manually set the cookie
    session_a2.cookies.set("user_id", user_a)

    # Get balances in new session
    print("\n6. Getting balances in new session...")
    persisted_balances = get_balances(session_a2)
    print(f"   Persisted balances: {json.dumps(persisted_balances, indent=2)}")

    # Verify state persisted
    if abs(persisted_balances[from_acc]["current"] - expected_from) > 0.01:
        print(f"❌ State not persisted! From account: expected {expected_from}, got {persisted_balances[from_acc]['current']}")
        return False

    if abs(persisted_balances[to_acc]["current"] - expected_to) > 0.01:
        print(f"❌ State not persisted! To account: expected {expected_to}, got {persisted_balances[to_acc]['current']}")
        return False

    print("✅ State persisted correctly across sessions!")
    return True

def test_user_isolation():
    """Test that different users have isolated state."""
    print("\n=== Test 2: User Isolation ===")

    # Create two users
    print("\n1. Creating user A...")
    session_a, user_a = create_test_user("user_a")
    if not user_a:
        print("❌ Failed to create user A")
        return False

    print("\n2. Creating user B...")
    session_b, user_b = create_test_user("user_b")
    if not user_b:
        print("❌ Failed to create user B")
        return False

    print(f"   User A ID: {user_a}")
    print(f"   User B ID: {user_b}")

    if user_a == user_b:
        print("❌ Users have same ID - isolation test invalid")
        return False

    # Get balances for both users
    print("\n3. Getting balances for both users...")
    balances_a = get_balances(session_a)
    balances_b = get_balances(session_b)

    print(f"\n   User A balances: {json.dumps(balances_a, indent=2)}")
    print(f"\n   User B balances: {json.dumps(balances_b, indent=2)}")

    # They should have different account IDs (randomly generated)
    account_ids_a = set(balances_a.keys())
    account_ids_b = set(balances_b.keys())

    if account_ids_a == account_ids_b:
        print("⚠️  Warning: Users have same account IDs (this is unlikely but possible)")

    # Make a transfer for user A
    if len(balances_a) >= 2:
        account_ids = list(balances_a.keys())
        from_acc = account_ids[0]
        to_acc = account_ids[1]
        transfer_amount = 50.0

        print(f"\n4. Making transfer of ${transfer_amount} for user A...")
        make_transfer(session_a, from_acc, to_acc, transfer_amount)

        # Get updated balances
        new_balances_a = get_balances(session_a)
        new_balances_b = get_balances(session_b)

        print(f"\n   User A balances after transfer: {json.dumps(new_balances_a, indent=2)}")
        print(f"\n   User B balances (should be unchanged): {json.dumps(new_balances_b, indent=2)}")

        # User B's balances should not have changed
        if balances_b != new_balances_b:
            print("❌ User B's state changed when user A made a transfer!")
            return False

        print("✅ User B's state remained unchanged - isolation working!")
    else:
        print("⚠️  Not enough accounts to test transfer isolation")

    print("✅ Users have isolated state!")
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("State Persistence and User Isolation Tests")
    print("=" * 60)

    test1_passed = test_state_persistence()
    test2_passed = test_user_isolation()

    print("\n" + "=" * 60)
    print("RESULTS:")
    print("=" * 60)
    print(f"Test 1 (State Persistence): {'✅ PASS' if test1_passed else '❌ FAIL'}")
    print(f"Test 2 (User Isolation): {'✅ PASS' if test2_passed else '❌ FAIL'}")
    print("=" * 60)

    if test1_passed and test2_passed:
        print("\n🎉 All tests passed!")
        exit(0)
    else:
        print("\n❌ Some tests failed")
        exit(1)
