# VaultBank Banking Clone

A realistic VaultBank clone for AI/automation task environments. All banking data is fake and state-defined via cookie-scoped backend.

**⚠️ This is NOT a real banking application. All data is fake and simulated. For testing and experimental purposes only.**

## Overview

This application simulates a complete online banking experience with accounts, credit cards, loans, investments, bill pay, and transfers. Built on the Base Experiment Site architecture with cookie-scoped state management.

## Quick Start

### Using init.sh (Recommended)

```bash
# Run the initialization script
./init.sh
```

This will install dependencies and start both servers. Access the app at http://localhost:5173.

### Manual Start

Backend (uv):

```bash
cd backend
uv venv
uv pip install -r requirements.txt
uv run uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host --port 5173
```

Open the frontend at http://localhost:5173. The UI calls the backend at `http://localhost:8000/api` (overridable via `VITE_API_BASE`).

## Docker compose
```bash
docker compose up --build
```
Open http://localhost (nginx reverse proxy). It routes `/api` and `/mcp` to the backend and everything else to the production frontend container.

## Features

### Core Banking Features
- **Accounts**: Checking, Savings, CDs, Money Market with transaction history
- **Transfers**: Internal and external transfers with scheduling
- **Bill Pay**: Payee management and one-time/recurring payments
- **Credit Cards**: Balance tracking, payments, statements, card freeze
- **Loans**: Auto, mortgage, personal loans with payment schedules
- **Investments**: Brokerage and retirement accounts with simulated trading
- **Statements & Documents**: Download statements and tax documents
- **Security**: Card freeze, login history, profile management

### Architecture
- Per-user state keyed by cookie; no login required.
- REST endpoints for state lifecycle (`GET/PUT/PATCH/DELETE /api/state`) plus system info and health.
- Convenience endpoints: `POST /api/transfer`, `POST /api/payment`, `GET /api/accounts`
- MCP server (Streamable HTTP) mounted at `/mcp` mirroring the REST operations; accepts `user_cookie` to target a specific state.
- You can pin identity via querystring `?cookie=your-id` on any API call; the backend will also set that as the response cookie.
- Frontend uses Chakra UI with custom VaultBank theme.
- Initial state includes sample accounts and transactions.
- Auto-generated OpenAPI docs at `/api/docs` and curated `API.md`.
- Frontend panel to inspect/update state and view request/system context (`/state-manage` - required).
- Extensible patterns documented in `docs/EXTENDING.md`.

## Repository layout
- `backend/`: FastAPI app, config, and state store.
- `frontend/`: Vite + React UI with Chakra UI components.
- `feature_list.json`: 190+ feature test cases for autonomous development.
- `init.sh`: Automated setup script for development environment.
- `docs/`: Guides for extending the backend/frontend and experiments.
- `API.md`: Endpoint reference with examples.
- `AGENT.md`: Notes for automation/agent integrations.
- MCP Streamable HTTP endpoint at `/mcp` (tools: `get_accounts`, `execute_transfer`, and state operations).

## Testing
- Backend (uv): `cd backend && uv pip install -r requirements.txt pytest pytest-asyncio httpx && uv run pytest`
- Frontend: recommended stack `vitest` + Testing Library (see `docs/TESTING.md` for setup).

## Environment variables
- `API_PREFIX` (default `/api`)
- `COOKIE_NAME` (default `user_id`)
- `COOKIE_MAX_AGE` (seconds, default 30d)
- `CORS_ORIGINS` (JSON list, default `["http://localhost:5173"]`)
- `DEBUG` (boolean)

Set them in `backend/.env` (see `backend/.env.example`).

## Development tips
- Use `ruff`/`black` (optional) for backend formatting; `eslint`/`prettier` for frontend.
- Keep API shapes in sync with `API.md`; run the app and verify Swagger UI after changes.
- When adding state fields, update the Pydantic models and the frontend preview/editor.
