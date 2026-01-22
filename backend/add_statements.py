"""
Add statements to existing accounts in the state.
Run this to populate statements for accounts that don't have them.
"""
import sys
import asyncio
sys.path.insert(0, '.')
from init_banking_data import generate_statements
import httpx

async def add_statements_to_state():
    """Add statements to all accounts and credit cards in the state."""
    user_id = "c84b7873-cbc4-4cda-b275-7e0b8e3a5f08"

    async with httpx.AsyncClient() as client:
        # Get current state
        response = await client.get(
            "http://localhost:8000/api/state",
            cookies={"user_id": user_id}
        )
        state_data = response.json()["state"]["data"]

        # Add statements to accounts
        accounts_updated = 0
        for account in state_data.get("accounts", []):
            if not account.get("statements") or len(account.get("statements", [])) == 0:
                account["statements"] = generate_statements(account["id"])
                print(f'Added {len(account["statements"])} statements to account {account["nickname"]}')
                accounts_updated += 1
            else:
                print(f'Account {account["nickname"]} already has {len(account["statements"])} statements')

        # Add statements to credit cards
        cards_updated = 0
        for card in state_data.get("credit_cards", []):
            if not card.get("statements") or len(card.get("statements", [])) == 0:
                card["statements"] = generate_statements(card["id"])
                print(f'Added {len(card["statements"])} statements to credit card ending in {card["card_number"]}')
                cards_updated += 1
            else:
                print(f'Credit card ending in {card["card_number"]} already has {len(card["statements"])} statements')

        if accounts_updated == 0 and cards_updated == 0:
            print("\nNo updates needed - all accounts and cards already have statements")
            return

        # Update state via PATCH
        patch_response = await client.patch(
            "http://localhost:8000/api/state",
            cookies={"user_id": user_id},
            json={
                "data": {
                    "accounts": state_data.get("accounts", []),
                    "credit_cards": state_data.get("credit_cards", [])
                },
                "note": "Added statements to accounts and credit cards"
            }
        )

        print(f"\nState updated successfully!")
        print(f"Updated {accounts_updated} accounts and {cards_updated} credit cards")

if __name__ == "__main__":
    asyncio.run(add_statements_to_state())
