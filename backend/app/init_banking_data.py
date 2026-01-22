"""
Initialize VaultBank banking state with sample data.
Run this to populate a user's state with accounts, transactions, etc.
"""
import json
from datetime import datetime, timedelta
from random import randint, choice
from decimal import Decimal

def generate_account_id():
    """Generate a random account ID."""
    return f"acct_{randint(10000000, 99999999)}"

def generate_transaction_id():
    """Generate a random transaction ID."""
    return f"txn_{randint(100000000, 999999999)}"

def generate_sample_transactions(account_id, account_type, days=60):
    """Generate sample transactions for an account."""
    transactions = []
    today = datetime.now()
    areas = ["San Francisco", "New York", "Austin", "Seattle", "Chicago", "Boston"]
    countries = ["United States", "Canada", "United Kingdom", "Germany", "Japan", "Australia"]

    merchants = {
        "checking": [
            "Starbucks", "Amazon", "Whole Foods", "Shell Gas Station", "Target",
            "Netflix", "Uber", "AT&T Wireless", "Electric Company", "Water Utility",
            "Gym Membership", "Pizza Hut", "Walgreens", "Costco", "Home Depot"
        ],
        "savings": [
            "Interest Payment", "Transfer from Checking", "Deposit"
        ]
    }

    categories = {
        "checking": ["Food & Dining", "Shopping", "Transportation", "Utilities",
                    "Entertainment", "Healthcare", "Transfer"],
        "savings": ["Interest", "Transfer", "Deposit"]
    }

    balance = Decimal(str(randint(2000, 8000) * 100)) / 100  # Random starting balance

    for i in range(days):
        base_date = today - timedelta(days=i)
        # 1-3 transactions per day for checking
        num_transactions = randint(0, 3) if account_type == "checking" else randint(0, 1)

        for _ in range(num_transactions):
            transaction_datetime = base_date.replace(
                hour=randint(0, 23),
                minute=randint(0, 59),
                second=randint(0, 59),
                microsecond=0,
            )
            if account_type == "checking":
                merchant = choice(merchants["checking"])
                category = choice(categories["checking"])

                # Random amount between $5 and $200
                amount = Decimal(str(randint(5, 200) * 100)) / 100

                # Occasional credit (return, refund)
                if randint(1, 20) == 1:
                    amount = -amount
                    transaction_type = "credit"
                else:
                    transaction_type = "debit"

                balance -= amount

            else:  # savings
                merchant = choice(merchants["savings"])
                category = choice(categories["savings"])

                if merchant == "Interest Payment":
                    amount = Decimal(str(randint(10, 50) * 100)) / 100
                    transaction_type = "credit"
                    balance += amount
                elif merchant == "Transfer from Checking":
                    amount = Decimal(str(randint(100, 500) * 100)) / 100
                    transaction_type = "credit"
                    balance += amount
                else:  # Deposit
                    amount = Decimal(str(randint(500, 2000) * 100)) / 100
                    transaction_type = "credit"
                    balance += amount

            transaction = {
                "id": generate_transaction_id(),
                "date": transaction_datetime.isoformat(),
                "post_date": (transaction_datetime + timedelta(days=1)).isoformat(),
                "transaction_time": transaction_datetime.strftime("%H:%M:%S"),
                "description": merchant,
                "amount": float(amount),
                "transaction_amount": float(abs(amount)),
                "billing_amount": float(abs(amount)),
                "transaction_currency": "USD",
                "billing_currency": "USD",
                "running_balance": float(balance),
                "category": category,
                "type": transaction_type,
                "merchant": merchant if account_type == "checking" else None,
                "merchant_name": merchant,
                "area_district": choice(areas),
                "country_region": choice(countries),
                "card_number": None,
            }
            transactions.append(transaction)

    # Sort by date descending (newest first)
    transactions.sort(key=lambda x: x["date"], reverse=True)
    return transactions

def generate_statements(account_id):
    """Generate sample statements for the last 12 months."""
    statements = []
    today = datetime.now()

    for i in range(12):
        month = today - timedelta(days=30*i)
        period = month.strftime("%B %Y")

        statements.append({
            "period": period,
            "url": f"/api/statements/{account_id}/{period.replace(' ', '_').lower()}.pdf",
            "generated_date": (month.replace(day=1)).isoformat()
        })

    return statements

def generate_credit_card_transactions(card_id, card_number, days=60):
    """Generate sample credit card transactions."""
    transactions = []
    today = datetime.now()
    areas = ["San Francisco", "New York", "Austin", "Seattle", "Chicago", "Boston"]
    countries = ["United States", "Canada", "United Kingdom", "Germany", "Japan", "Australia"]

    merchants = [
        "Apple Store", "Best Buy", "Delta Airlines", "Marriott Hotels",
        "Uber Eats", "DoorDash", "Amazon Prime", "Netflix", "Spotify",
        "Gas Station", "Grocery Store", "Department Store", "Online Retailer"
    ]

    categories = ["Electronics", "Travel", "Food & Dining", "Entertainment",
                  "Transportation", "Shopping", "Services"]

    balance = Decimal(str(randint(500, 2000) * 100)) / 100  # Current balance

    for i in range(days):
        base_date = today - timedelta(days=i)
        num_transactions = randint(0, 2)

        for _ in range(num_transactions):
            transaction_datetime = base_date.replace(
                hour=randint(0, 23),
                minute=randint(0, 59),
                second=randint(0, 59),
                microsecond=0,
            )
            merchant = choice(merchants)
            category = choice(categories)
            amount = Decimal(str(randint(10, 500) * 100)) / 100

            balance += amount

            transaction = {
                "id": generate_transaction_id(),
                "date": transaction_datetime.isoformat(),
                "post_date": (transaction_datetime + timedelta(days=1)).isoformat(),
                "transaction_time": transaction_datetime.strftime("%H:%M:%S"),
                "description": merchant,
                "amount": float(amount),
                "transaction_amount": float(amount),
                "billing_amount": float(amount),
                "transaction_currency": "USD",
                "billing_currency": "USD",
                "category": category,
                "type": "debit",
                "merchant": merchant,
                "merchant_name": merchant,
                "area_district": choice(areas),
                "country_region": choice(countries),
                "card_number": card_number,
            }
            transactions.append(transaction)

    transactions.sort(key=lambda x: x["date"], reverse=True)
    return transactions, float(balance)

def generate_banking_state():
    """Generate complete banking state with sample data."""
    today = datetime.now()

    # Generate accounts
    accounts = []

    # Checking account
    checking_id = generate_account_id()
    checking_transactions = generate_sample_transactions(checking_id, "checking")
    checking_balance = checking_transactions[0]["running_balance"] if checking_transactions else 5000.00

    accounts.append({
        "id": checking_id,
        "type": "checking",
        "nickname": "Primary Checking",
        "account_number": "4821",
        "routing_number": "021000021",
        "current_balance": checking_balance,
        "available_balance": checking_balance,
        "currency": "USD",
        "opened_date": (today - timedelta(days=365*3)).isoformat(),
        "transactions": checking_transactions,
        "statements": generate_statements(checking_id),
        "status": "active",
        "card_frozen": False
    })

    # Savings account
    savings_id = generate_account_id()
    savings_transactions = generate_sample_transactions(savings_id, "savings")
    savings_balance = savings_transactions[0]["running_balance"] if savings_transactions else 25000.00

    accounts.append({
        "id": savings_id,
        "type": "savings",
        "nickname": "Emergency Savings",
        "account_number": "7293",
        "routing_number": "021000021",
        "current_balance": savings_balance,
        "available_balance": savings_balance,
        "currency": "USD",
        "opened_date": (today - timedelta(days=365*2)).isoformat(),
        "transactions": savings_transactions,
        "statements": generate_statements(savings_id),
        "status": "active",
        "card_frozen": False
    })

    # Credit card
    card_id = f"card_{randint(10000000, 99999999)}"
    card_transactions, card_balance = generate_credit_card_transactions(card_id, "4532")

    credit_cards = [{
        "id": card_id,
        "card_number": "4532",
        "cardholder_name": "JOHN DOE",
        "expiration_date": "09/26",
        "current_balance": card_balance,
        "available_credit": 10000 - card_balance,
        "credit_limit": 10000,
        "payment_due_date": (today + timedelta(days=15)).isoformat(),
        "minimum_payment": float(Decimal(str(card_balance)) * Decimal("0.02")),
        "statements": generate_statements(card_id),
        "transactions": card_transactions,
        "status": "active",
        "card_frozen": False
    }]

    # Generate loans
    loans = []

    # Auto loan
    auto_loan_id = f"loan_{randint(100000, 999999)}"
    auto_original = 35000
    auto_balance = 28450.00
    loans.append({
        "id": auto_loan_id,
        "type": "auto",
        "loan_number": "AL847291",
        "original_amount": auto_original,
        "current_balance": auto_balance,
        "interest_rate": 4.5,
        "monthly_payment": 658.50,
        "due_date": (today + timedelta(days=5)).isoformat(),
        "start_date": (today - timedelta(days=365)).isoformat(),
        "maturity_date": (today + timedelta(days=365*4)).isoformat(),
        "payment_schedule": [],
        "payment_history": [],
        "status": "active"
    })

    # Investments
    investments = {
        "brokerage": {
            "account_number": "BR928374",
            "cash_balance": 2530.45,
            "total_value": 48530.45,
            "holdings": [
                {
                    "symbol": "AAPL",
                    "name": "Apple Inc.",
                    "quantity": 50,
                    "average_cost": 145.30,
                    "current_price": 178.25,
                    "current_value": 8912.50,
                    "gain_loss": 1647.50,
                    "gain_loss_percent": 22.7
                },
                {
                    "symbol": "MSFT",
                    "name": "Microsoft Corporation",
                    "quantity": 30,
                    "average_cost": 285.40,
                    "current_price": 378.91,
                    "current_value": 11367.30,
                    "gain_loss": 2805.30,
                    "gain_loss_percent": 32.7
                },
                {
                    "symbol": "GOOGL",
                    "name": "Alphabet Inc.",
                    "quantity": 25,
                    "average_cost": 118.20,
                    "current_price": 141.80,
                    "current_value": 3545.00,
                    "gain_loss": 590.00,
                    "gain_loss_percent": 19.9
                }
            ],
            "trades": []
        },
        "retirement": [
            {
                "account_type": "401k",
                "account_number": "RT401847",
                "cash_balance": 1250.00,
                "total_value": 32550.00,
                "holdings": [
                    {
                        "symbol": "VFIAX",
                        "name": "Vanguard 500 Index Fund",
                        "quantity": 85,
                        "average_cost": 325.40,
                        "current_price": 378.20,
                        "current_value": 32147.00,
                        "gain_loss": 4486.00,
                        "gain_loss_percent": 16.2
                    }
                ],
                "trades": []
            }
        ]
    }

    # Bill pay
    bill_pay = {
        "payees": [
            {
                "id": "payee_1",
                "name": "Electric Company",
                "account_number": "123456789",
                "address": "123 Power St, Energy City, EC 12345",
                "nickname": "Electric Bill"
            },
            {
                "id": "payee_2",
                "name": "Landlord",
                "account_number": "987654321",
                "address": "456 Rental Ave, Apt 7B, Town, ST 54321",
                "nickname": "Rent"
            },
            {
                "id": "payee_3",
                "name": "Cable Provider",
                "account_number": "555555555",
                "address": "789 Media Blvd, Television City, TC 13579",
                "nickname": "Internet & Cable"
            }
        ],
        "scheduled_payments": [],
        "payment_history": []
    }

    # Transfers
    transfers = {
        "history": [],
        "scheduled": []
    }

    # User profile
    user_profile = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "(555) 123-4567",
        "address": {
            "street": "123 Main Street",
            "city": "New York",
            "state": "NY",
            "zip": "10001"
        },
        "communication_preferences": {
            "paperless": True,
            "email_notifications": True,
            "sms_notifications": False
        },
        "security": {
            "recent_logins": [
                {
                    "timestamp": today.isoformat(),
                    "ip_address": "192.168.1.100",
                    "device": "Chrome on Windows",
                    "location": "New York, NY"
                },
                {
                    "timestamp": (today - timedelta(days=1)).isoformat(),
                    "ip_address": "192.168.1.100",
                    "device": "Chrome on Windows",
                    "location": "New York, NY"
                }
            ]
        }
    }

    # Complete state structure
    banking_state = {
        "accounts": accounts,
        "credit_cards": credit_cards,
        "loans": loans,
        "investments": investments,
        "bill_pay": bill_pay,
        "transfers": transfers,
        "user_profile": user_profile
    }

    return banking_state

if __name__ == "__main__":
    state = generate_banking_state()
    print(json.dumps(state, indent=2))
