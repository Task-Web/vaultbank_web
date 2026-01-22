# VaultBank Banking Clone State Reference

This document describes the per-user state stored by the VaultBank Banking Clone.
The backend stores a UserState envelope in memory keyed by a cookie. The `data`
object is free-form, but the UI and API expect the canonical keys documented
below. Default state is generated in `backend/app/init_banking_data.py` and
includes sample accounts, transactions, cards, loans, investments, and profile
data.

All timestamps are ISO 8601 UTC strings unless noted.

## State envelope (UserState)
- `meta.created_at` (string): When the state was created.
- `meta.updated_at` (string): Last update time (patch/merge).
- `meta.version` (number): Incremented on each patch/merge.
- `meta.type` (string): Currently `unrestricted`.
- `data` (object): Banking data container.
- `note` (string or null): Optional note describing the last change.

## State lifecycle
- `GET /api/state` returns `{ user_id, state: { meta, data, note } }`.
- `PATCH /api/state` deep-merges into `data`. Objects merge recursively; arrays
  replace. `meta.updated_at` and `meta.version` update.
- `PUT /api/state` replaces the entire envelope. You may supply `meta` or let
  the backend generate a new one.
- `DELETE /api/state` resets to a fresh default banking state and clears stored
  uploads for the current user.

## Data shape (canonical keys)

### `accounts` (Account[])
Deposit accounts such as checking/savings/CD/money market.
- `id` (string): `acct_...`
- `type` (string): `checking` | `savings` | `cd` | `money_market`
- `nickname` (string)
- `account_number` (string): last 4 digits
- `routing_number` (string)
- `current_balance` (number)
- `available_balance` (number)
- `currency` (string): typically `USD`
- `opened_date` (string)
- `transactions` (Transaction[])
- `statements` (Statement[])
- `status` (string): `active` | `frozen` | `closed`
- `card_frozen` (boolean): debit card freeze flag

### `credit_cards` (CreditCard[])
- `id` (string): `card_...`
- `card_number` (string): last 4 digits
- `cardholder_name` (string)
- `expiration_date` (string): `MM/YY`
- `current_balance` (number)
- `available_credit` (number)
- `credit_limit` (number)
- `payment_due_date` (string)
- `minimum_payment` (number)
- `transactions` (Transaction[])
- `statements` (Statement[])
- `status` (string): `active` | `frozen` | `closed`
- `card_frozen` (boolean)

### `loans` (Loan[])
- `id` (string): `loan_...`
- `type` (string): `auto` | `mortgage` | `personal`
- `loan_number` (string)
- `original_amount` (number)
- `current_balance` (number)
- `interest_rate` (number): APR percent
- `monthly_payment` (number)
- `due_date` (string)
- `start_date` (string)
- `maturity_date` (string)
- `payment_schedule` (LoanPayment[])
- `payment_history` (LoanPaymentHistory[])
- `status` (string): `active` | `closed`

### `investments` (object)
```
{
  "brokerage": InvestmentAccount,
  "retirement": InvestmentAccount[]
}
```

InvestmentAccount fields (brokerage and retirement):
- `account_type` (string): retirement only (e.g. `401k`, `IRA`)
- `account_number` (string)
- `cash_balance` (number)
- `total_value` (number)
- `day_change` (number, optional)
- `day_change_percent` (number, optional)
- `total_return` (number, optional)
- `total_return_percent` (number, optional)
- `holdings` (Holding[])
- `trades` (Trade[])

Holding fields:
- `symbol` (string)
- `name` (string)
- `quantity` (number)
- `average_cost` (number)
- `current_price` (number)
- `current_value` (number)
- `cost_basis` (number)
- `gain_loss` (number)
- `gain_loss_percent` (number)

Trade fields:
- `id` (string)
- `symbol` (string)
- `type` (string): `buy` | `sell`
- `quantity` (number)
- `price` (number)
- `total` (number)
- `date` (string)

### `bill_pay` (object)
- `payees` (Payee[])
- `scheduled_payments` (ScheduledPayment[])
- `payment_history` (BillPayment[])

Payee fields:
- `id` (string)
- `name` (string)
- `account_number` (string)
- `address` (string)
- `nickname` (string, optional)

ScheduledPayment fields:
- `id` (string)
- `payee_id` (string)
- `amount` (number)
- `frequency` (string): usually `once`
- `next_date` (string)
- `from_account_id` (string)
- `status` (string): `active` | `pending` | `scheduled`

BillPayment fields:
- `id` (string)
- `from_account_id` (string)
- `amount` (number)
- `date` (string)
- `status` (string): `completed` | `pending`
- `reference_number` (string)
- `memo` (string, optional)
- bill payment: `payee_id`, `payee_name`
- credit card payment: `credit_card_id`, `card_number`

### `transfers` (object)
- `history` (Transfer[])
- `scheduled` (Transfer[])

Transfer fields:
- `id` (string)
- `from_account_id` (string)
- `to_account_id` (string, internal only)
- `amount` (number)
- `date` (string)
- `status` (string): `completed` | `pending` | `scheduled`
- `type` (string): `internal` | `external`
- `frequency` (string): `once`, `weekly`, `monthly`, etc.
- `memo` (string, optional)
- `reference_number` (string)
- `external_account` (object, external only):
  - `name` (string)
  - `account_number` (string): last 4 digits
  - `routing_number` (string)
  - `account_type` (string): `checking` | `savings`

### `mobile_deposits` (MobileDeposit[])
- `id` (string)
- `account_id` (string)
- `amount` (number)
- `front_image` (string): filename
- `back_image` (string): filename
- `date` (string)
- `status` (string): `completed` | `pending` | `rejected`
- `reference_number` (string)

### `user_profile` (object)
- `first_name` (string)
- `last_name` (string)
- `email` (string)
- `phone` (string)
- `address` (object): `street`, `city`, `state`, `zip`
- `communication_preferences` (object):
  - `paperless` (boolean)
  - `email_notifications` (boolean)
  - `sms_notifications` (boolean)
- `security` (object):
  - `recent_logins` (LoginEvent[])

LoginEvent fields:
- `timestamp` (string)
- `ip_address` (string)
- `device` (string)
- `location` (string)

### `examples` and `uploads` (base-site compatibility)
These fields are kept for Base Experiment Site compatibility.
- `examples.huggingface_file.url` (string)
- `examples.huggingface_file.note` (string)
- `uploads` (Upload[])

Upload fields:
- `id` (string)
- `name` (string)
- `filename` (string)
- `type` (string)
- `size` (number)
- `url` (string)
- `uploaded_at` (string, optional)
- `content_type` (string, optional legacy)
- `content_base64` (string, optional legacy)

## Shared objects

### Transaction
Used by deposit accounts and credit cards. The `amount` sign can vary; rely on
`type` for semantics.
- `id` (string)
- `date` (string)
- `post_date` (string)
- `transaction_time` (string): `HH:MM:SS`
- `description` (string)
- `amount` (number)
- `transaction_amount` (number)
- `billing_amount` (number)
- `transaction_currency` (string)
- `billing_currency` (string)
- `running_balance` (number, deposit accounts only)
- `category` (string)
- `type` (string): `credit` | `debit` | `pending`
- `merchant` (string, optional)
- `merchant_name` (string)
- `area_district` (string)
- `country_region` (string)
- `card_number` (string, optional)

### Statement
- `period` (string): e.g. `January 2025`
- `url` (string): API path to statement PDF
- `generated_date` (string)

### LoanPayment
- `date` (string)
- `amount` (number)
- `principal` (number)
- `interest` (number)
- `remaining_balance` (number)
- `status` (string): `paid` | `pending` | `scheduled`

### LoanPaymentHistory
- `date` (string)
- `amount` (number)
- `status` (string): `completed` | `pending`

## Minimal example (UserState)
```json
{
  "meta": {
    "created_at": "2024-04-01T12:00:00+00:00",
    "updated_at": "2024-04-01T12:30:00+00:00",
    "version": 2,
    "type": "unrestricted"
  },
  "data": {
    "accounts": [],
    "credit_cards": [],
    "loans": [],
    "investments": { "brokerage": {}, "retirement": [] },
    "bill_pay": { "payees": [], "scheduled_payments": [], "payment_history": [] },
    "transfers": { "history": [], "scheduled": [] },
    "mobile_deposits": [],
    "user_profile": {},
    "examples": {
      "huggingface_file": {
        "url": "https://huggingface.co/datasets/adlsdztony/osworld-v2/blob/main/email_031.tar.gz",
        "note": "Optional reference link"
      }
    },
    "uploads": []
  },
  "note": "Optional note about this state"
}
```
