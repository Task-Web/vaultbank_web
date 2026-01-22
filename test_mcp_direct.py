#!/usr/bin/env python3
"""Direct test of MCP tool functions"""

import sys
import os
import asyncio

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.main import mcp_get_accounts, mcp_execute_transfer

async def test_mcp_tools_direct():
    """Test MCP tools by calling them directly"""

    user_cookie = "test_user_direct_123"

    print("=" * 60)
    print("Test 1: Direct call to mcp_get_accounts")
    print("=" * 60)

    try:
        # First initialize some data
        from app.main import patch_state, StatePatchRequest
        await patch_state(
            StatePatchRequest(
                data={
                    "accounts": [
                        {
                            "id": "test_acct_1",
                            "type": "checking",
                            "nickname": "Test Checking",
                            "account_number": "*9999",
                            "current_balance": 1000.00,
                            "available_balance": 1000.00,
                        }
                    ]
                },
                note="Test data for MCP"
            ),
            "test_user_for_mcp"
        )

        # Test get_accounts
        result = await mcp_get_accounts(user_cookie="test_user_for_mcp")
        print(f"✅ mcp_get_accounts returned: {len(result)} accounts")
        for account in result:
            print(f"  - {account['nickname']}: ${account['current_balance']:.2f}")

    except Exception as e:
        print(f"❌ mcp_get_accounts failed: {e}")
        import traceback
        traceback.print_exc()

    print()

    print("=" * 60)
    print("Test 2: Direct call to mcp_execute_transfer")
    print("=" * 60)

    try:
        # Add a second account
        from app.main import patch_state, StatePatchRequest
        await patch_state(
            StatePatchRequest(
                data={
                    "accounts": [
                        {
                            "id": "test_acct_1",
                            "type": "checking",
                            "nickname": "Test Checking",
                            "account_number": "*9999",
                            "current_balance": 1000.00,
                            "available_balance": 1000.00,
                        },
                        {
                            "id": "test_acct_2",
                            "type": "savings",
                            "nickname": "Test Savings",
                            "account_number": "*8888",
                            "current_balance": 5000.00,
                            "available_balance": 5000.00,
                        }
                    ]
                },
                note="Add second account"
            ),
            "test_user_for_mcp"
        )

        # Test execute_transfer
        result = await mcp_execute_transfer(
            from_account_id="test_acct_1",
            to_account_id="test_acct_2",
            amount=100.00,
            memo="Direct MCP test",
            user_cookie="test_user_for_mcp"
        )

        print(f"✅ mcp_execute_transfer completed")
        print(f"  - Success: {result['success']}")
        print(f"  - Reference: {result['reference_number']}")
        print(f"  - Message: {result['message']}")

        # Verify balances changed
        from app.main import get_state
        state_response = await get_state("test_user_for_mcp")
        accounts = state_response.state.data.get("accounts", [])

        print("\n  Updated balances:")
        for acc in accounts:
            print(f"    - {acc['nickname']}: ${acc['current_balance']:.2f}")

    except Exception as e:
        print(f"❌ mcp_execute_transfer failed: {e}")
        import traceback
        traceback.print_exc()

    print()

    print("=" * 60)
    print("Test 3: Test insufficient funds validation")
    print("=" * 60)

    try:
        result = await mcp_execute_transfer(
            from_account_id="test_acct_1",
            to_account_id="test_acct_2",
            amount=999999.00,  # Way more than balance
            memo="Should fail",
            user_cookie="test_user_for_mcp"
        )
        print(f"❌ Expected error but got success: {result}")

    except Exception as e:
        print(f"✅ Correctly raised error for insufficient funds")
        print(f"  Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_mcp_tools_direct())
