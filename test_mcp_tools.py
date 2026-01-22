#!/usr/bin/env python3
"""Test script for MCP tools"""

import asyncio
import httpx

async def test_mcp_tools():
    """Test the MCP tools using HTTP"""

    base_url = "http://localhost:8000/mcp"
    user_cookie = "test_user_123"

    # Test 1: Call get_accounts tool
    print("=" * 60)
    print("Test 1: MCP Tool - get_accounts")
    print("=" * 60)

    request1 = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "get_accounts",
            "arguments": {
                "user_cookie": user_cookie
            }
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response1 = await client.post(base_url, json=request1, timeout=10.0)
            print(f"Status: {response1.status_code}")
            print(f"Response: {response1.text[:500]}")

            if response1.status_code == 200:
                print("✅ get_accounts tool accessible!")
            else:
                print("❌ get_accounts tool failed")
    except Exception as e:
        print(f"❌ Error calling get_accounts: {e}")

    print()

    # Test 2: Call execute_transfer tool
    print("=" * 60)
    print("Test 2: MCP Tool - execute_transfer")
    print("=" * 60)

    request2 = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "execute_transfer",
            "arguments": {
                "from_account_id": "acct_1",
                "to_account_id": "acct_2",
                "amount": 50.00,
                "memo": "Test transfer via MCP",
                "user_cookie": user_cookie
            }
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            response2 = await client.post(base_url, json=request2, timeout=10.0)
            print(f"Status: {response2.status_code}")
            print(f"Response: {response2.text[:500]}")

            if response2.status_code == 200:
                print("✅ execute_transfer tool accessible!")
            else:
                print("❌ execute_transfer tool failed")
    except Exception as e:
        print(f"❌ Error calling execute_transfer: {e}")

    print()

    # Test 3: List all available tools
    print("=" * 60)
    print("Test 3: List Available MCP Tools")
    print("=" * 60)

    request3 = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/list",
        "params": {}
    }

    try:
        async with httpx.AsyncClient() as client:
            response3 = await client.post(base_url, json=request3, timeout=10.0)
            print(f"Status: {response3.status_code}")
            print(f"Response: {response3.text[:1000]}")

            if response3.status_code == 200:
                print("✅ Tools list retrieved!")
            else:
                print("❌ Tools list failed")
    except Exception as e:
        print(f"❌ Error listing tools: {e}")

if __name__ == "__main__":
    asyncio.run(test_mcp_tools())
