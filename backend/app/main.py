import mimetypes
import os
import platform
import uuid
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from mcp.server.fastmcp import FastMCP

from .config import Settings, get_settings
from .file_store import FileStore
from .schemas import FileMetadata, InfoResponse, StatePatchRequest, StateRequest, StateResponse
from .state_store import StateStore
from pydantic import BaseModel

settings = get_settings()
store = StateStore()
file_store = FileStore("files", settings.api_prefix)

tags_metadata = [
    {"name": "state", "description": "Manage per-user experiment state"},
    {"name": "files", "description": "Upload and fetch files scoped to a user cookie"},
    {"name": "system", "description": "Environment and health information"},
    {"name": "convenience", "description": "Convenience endpoints for common operations"},
]


def _resolve_user_cookie(provided: Optional[str]) -> str:
    return provided if provided else str(uuid.uuid4())


def _set_user_cookie(response: Response, user_id: str, settings: Settings) -> None:
    response.set_cookie(
        settings.cookie_name,
        user_id,
        max_age=settings.cookie_max_age,
        httponly=False,
        samesite="lax",
    )


# MCP server mirrors REST API operations via Streamable HTTP
mcp_server = FastMCP(
    name=f"{settings.app_name} MCP",
    instructions=(
        "Streamable HTTP MCP interface mirroring the REST API. "
        "Supply user_cookie to reuse the same per-user state; "
        "omit to generate a new cookie-backed state."
    ),
    host="0.0.0.0",
    streamable_http_path="/",
)

mcp_http_app = mcp_server.streamable_http_app()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start MCP session manager so Streamable HTTP transport works when mounted
    mcp_ctx = mcp_server.session_manager.run()
    await mcp_ctx.__aenter__()
    try:
        yield
    finally:
        await mcp_ctx.__aexit__(None, None, None)


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    openapi_tags=tags_metadata,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_user_id(
    request: Request, response: Response, settings: Settings = Depends(get_settings)
) -> str:
    cookie_override = request.query_params.get("cookie")
    user_id = cookie_override or request.cookies.get(settings.cookie_name)
    if not user_id:
        user_id = str(uuid.uuid4())
    _set_user_cookie(response, user_id, settings)
    return user_id


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    # Minimal middleware that ensures each response carries a request id header.
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    response: JSONResponse = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


@app.get("/health", tags=["system"])
async def health() -> Dict[str, str]:
    return {"status": "ok"}

# when build on the basesite, the below endpoints about state management should remain unchanged
@app.get(f"{settings.api_prefix}/state", response_model=StateResponse, tags=["state"])
async def get_state(user_id: str = Depends(get_user_id)) -> StateResponse:
    state = await store.get_state(user_id)
    return StateResponse(user_id=user_id, state=state)


@app.put(
    f"{settings.api_prefix}/state",
    response_model=StateResponse,
    tags=["state"],
    summary="Replace state",
)
async def put_state(payload: StateRequest, user_id: str = Depends(get_user_id)) -> StateResponse:
    next_state = {"data": payload.data, "note": payload.note}
    if payload.meta is not None:
        next_state["meta"] = payload.meta
    state = await store.replace_state(user_id, next_state)
    return StateResponse(user_id=user_id, state=state)


@app.patch(
    f"{settings.api_prefix}/state",
    response_model=StateResponse,
    tags=["state"],
    summary="Merge into existing state",
)
async def patch_state(
    payload: StatePatchRequest, user_id: str = Depends(get_user_id)
) -> StateResponse:
    state = await store.patch_state(user_id, patch=payload.data, note=payload.note)
    return StateResponse(user_id=user_id, state=state)


@app.delete(
    f"{settings.api_prefix}/state",
    response_model=StateResponse,
    tags=["state"],
    summary="Reset and clear state",
)
async def delete_state(user_id: str = Depends(get_user_id)) -> StateResponse:
    file_store.delete_user_files(user_id)
    state = await store.reset_state(user_id)
    return StateResponse(user_id=user_id, state=state)


@app.post(
    f"{settings.api_prefix}/files",
    response_model=List[FileMetadata],
    tags=["files"],
    summary="Upload files for the current user",
)
async def upload_files(
    files: List[UploadFile] = File(...), user_id: str = Depends(get_user_id)
) -> List[FileMetadata]:
    return [file_store.save_upload(upload, user_id) for upload in files]


@app.get(
    f"{settings.api_prefix}/files",
    response_model=List[FileMetadata],
    tags=["files"],
    summary="List files for the current user",
)
async def list_files(user_id: str = Depends(get_user_id)) -> List[FileMetadata]:
    return file_store.list_files(user_id)


@app.get(
    f"{settings.api_prefix}/files/{{filename}}",
    tags=["files"],
    summary="Fetch a stored file for the current user",
)
async def get_file(filename: str, user_id: str = Depends(get_user_id)) -> FileResponse:
    target_path = file_store.get_file_path(user_id, filename)
    if not target_path:
        raise HTTPException(status_code=404, detail="File not found")
    display_name = filename.split("__", 1)[1] if "__" in filename else filename
    media_type = mimetypes.guess_type(display_name)[0] or "application/octet-stream"
    response = FileResponse(target_path, media_type=media_type, filename=display_name)
    _set_user_cookie(response, user_id, settings)
    return response


@app.get(
    f"{settings.api_prefix}/info",
    response_model=InfoResponse,
    tags=["system"],
    summary="System and request info",
)
async def info(request: Request, user_id: str = Depends(get_user_id)) -> InfoResponse:
    runtime_env = {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "env_mode": os.getenv("ENV", "dev"),
    }
    request_info: Dict[str, Any] = {
        "client": request.client.host if request.client else "unknown",
        "headers": dict(request.headers),
        "path": request.url.path,
        "method": request.method,
        "user_id": user_id,
    }
    return InfoResponse(
        app_name=settings.app_name,
        python_version=runtime_env["python_version"],
        env=runtime_env,
        request=request_info,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request.headers.get("x-request-id")},
    )


# Convenience API schemas
class TransferRequest(BaseModel):
    from_account_id: str
    to_account_id: Optional[str] = None
    amount: float
    transfer_type: str = "internal"  # "internal" or "external"
    frequency: str = "once"
    scheduled_date: Optional[str] = None
    memo: Optional[str] = None
    # External transfer fields
    external_account_name: Optional[str] = None
    external_account_number: Optional[str] = None
    external_routing_number: Optional[str] = None
    external_account_type: Optional[str] = "checking"


class TransferResponse(BaseModel):
    success: bool
    transfer_id: str
    reference_number: str
    message: str


class PaymentRequest(BaseModel):
    from_account_id: str
    amount: float
    payment_type: str  # "bill" or "credit_card"
    payee_id: Optional[str] = None
    credit_card_id: Optional[str] = None
    scheduled_date: Optional[str] = None
    memo: Optional[str] = None


class PaymentResponse(BaseModel):
    success: bool
    payment_id: str
    reference_number: str
    message: str


# MCP Tools
@mcp_server.tool(
    name="info",
    description="Return backend environment info and the resolved user id.",
)
async def mcp_info(user_cookie: Optional[str] = None) -> Dict[str, Any]:
    user_id = _resolve_user_cookie(user_cookie)
    runtime_env = {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "env_mode": os.getenv("ENV", "dev"),
    }
    return {
        "app_name": settings.app_name,
        "user_id": user_id,
        "env": runtime_env,
    }


@mcp_server.tool(
    name="get_accounts",
    description="Get account summaries for the user including id, type, nickname, account number, and balances.",
)
async def mcp_get_accounts(user_cookie: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get account summaries for the user.

    Returns a list of accounts with id, type, nickname, account_number,
    current_balance, and available_balance for each account.
    """
    user_id = _resolve_user_cookie(user_cookie)
    state_response = await get_state(user_id)
    accounts = state_response.state.data.get("accounts", [])

    return [
        {
            "id": acc["id"],
            "type": acc["type"],
            "nickname": acc.get("nickname"),
            "account_number": acc["account_number"],
            "current_balance": acc["current_balance"],
            "available_balance": acc.get("available_balance", 0),
        }
        for acc in accounts
    ]


@mcp_server.tool(
    name="execute_transfer",
    description="Execute a transfer between accounts. Returns confirmation with reference number.",
)
async def mcp_execute_transfer(
    from_account_id: str,
    to_account_id: str,
    amount: float,
    memo: Optional[str] = None,
    user_cookie: Optional[str] = None
) -> Dict[str, Any]:
    """Execute a transfer between accounts.

    Parameters:
    - from_account_id: Source account ID
    - to_account_id: Destination account ID
    - amount: Transfer amount (must be positive)
    - memo: Optional memo/description for the transfer

    Returns:
    Dictionary with success status, transfer_id, reference_number, and message.

    Raises:
    HTTPException if accounts not found or insufficient funds.
    """
    user_id = _resolve_user_cookie(user_cookie)

    # Create transfer request
    transfer_request = TransferRequest(
        from_account_id=from_account_id,
        to_account_id=to_account_id,
        amount=amount,
        transfer_type="internal",
        frequency="once",
        memo=memo,
    )

    # Execute the transfer using the existing API endpoint logic
    result = await execute_transfer(transfer_request, user_id)

    return {
        "success": result.success,
        "transfer_id": result.transfer_id,
        "reference_number": result.reference_number,
        "message": result.message,
    }


# Convenience API endpoints
@app.post(
    f"{settings.api_prefix}/transfer",
    response_model=TransferResponse,
    tags=["convenience"],
    summary="Execute a transfer",
)
async def execute_transfer(
    payload: TransferRequest,
    user_id: str = Depends(get_user_id)
) -> TransferResponse:
    """Execute a transfer between accounts or to an external account."""
    # Get current state
    state_response = await get_state(user_id)
    current_state = state_response.state

    # Validate amount
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Transfer amount must be positive")

    # Find from account
    accounts = current_state.data.get("accounts", [])
    from_account = None
    for account in accounts:
        if account["id"] == payload.from_account_id:
            from_account = account
            break

    if not from_account:
        raise HTTPException(status_code=404, detail="Source account not found")

    # Check sufficient funds
    if payload.amount > from_account.get("available_balance", 0):
        raise HTTPException(status_code=400, detail="Insufficient funds in source account")

    # Create transfer record
    transfer_id = f"transfer_{uuid.uuid4().hex[:12]}"
    reference_number = f"TXF{str(int((1e9 - 1) * (hash(transfer_id) % 1e9) / 1e9) + 1e8)}"[:12]

    transfer = {
        "id": transfer_id,
        "from_account_id": payload.from_account_id,
        "amount": payload.amount,
        "date": payload.scheduled_date or None,
        "status": "pending" if (payload.frequency != "once" or payload.scheduled_date) else "completed",
        "type": payload.transfer_type,
        "frequency": payload.frequency,
        "memo": payload.memo,
        "reference_number": reference_number,
    }

    # Add destination account info based on transfer type
    if payload.transfer_type == "internal":
        if not payload.to_account_id:
            raise HTTPException(status_code=400, detail="to_account_id required for internal transfers")
        transfer["to_account_id"] = payload.to_account_id
    else:
        # External transfer
        transfer["external_account"] = {
            "name": payload.external_account_name,
            "account_number": payload.external_account_number[-4:] if payload.external_account_number else "",
            "routing_number": payload.external_routing_number,
            "account_type": payload.external_account_type,
        }

    # For immediate transfers, update account balances
    if payload.frequency == "once" and not payload.scheduled_date:
        now = datetime.utcnow()
        # Update from account
        updated_accounts = []
        for account in accounts:
            if account["id"] == payload.from_account_id:
                new_balance = account["current_balance"] - payload.amount
                new_available = account["available_balance"] - payload.amount
                currency = account.get("currency", "USD")
                transaction = {
                    "id": f"tx_{uuid.uuid4().hex[:12]}",
                    "date": now.isoformat(),
                    "post_date": (now + timedelta(days=1)).isoformat(),
                    "transaction_time": now.strftime("%H:%M:%S"),
                    "description": f"Transfer to {payload.to_account_id if payload.transfer_type == 'internal' else payload.external_account_name}",
                    "amount": -payload.amount,
                    "transaction_amount": payload.amount,
                    "billing_amount": payload.amount,
                    "transaction_currency": currency,
                    "billing_currency": currency,
                    "running_balance": new_balance,
                    "category": "Transfer",
                    "type": "debit",
                    "merchant_name": payload.external_account_name if payload.transfer_type != "internal" else "Transfer",
                    "area_district": "Online",
                    "country_region": "United States",
                    "card_number": account.get("account_number"),
                }
                account["current_balance"] = new_balance
                account["available_balance"] = new_available
                account.setdefault("transactions", []).insert(0, transaction)

            # For internal transfers, update to account
            if payload.transfer_type == "internal" and account["id"] == payload.to_account_id:
                new_balance = account["current_balance"] + payload.amount
                new_available = account["available_balance"] + payload.amount
                currency = account.get("currency", "USD")
                transaction = {
                    "id": f"tx_{uuid.uuid4().hex[:12]}",
                    "date": now.isoformat(),
                    "post_date": (now + timedelta(days=1)).isoformat(),
                    "transaction_time": now.strftime("%H:%M:%S"),
                    "description": f"Transfer from {from_account.get('nickname', 'Account')}",
                    "amount": payload.amount,
                    "transaction_amount": payload.amount,
                    "billing_amount": payload.amount,
                    "transaction_currency": currency,
                    "billing_currency": currency,
                    "running_balance": new_balance,
                    "category": "Transfer",
                    "type": "credit",
                    "merchant_name": from_account.get("nickname", "Transfer"),
                    "area_district": "Online",
                    "country_region": "United States",
                    "card_number": account.get("account_number"),
                }
                account["current_balance"] = new_balance
                account["available_balance"] = new_available
                account.setdefault("transactions", []).insert(0, transaction)

            updated_accounts.append(account)

        # Update state with account changes and history
        transfers_history = current_state.data.get("transfers", {}).get("history", [])
        await patch_state(
            StatePatchRequest(
                data={
                    "accounts": updated_accounts,
                    "transfers": {
                        "history": transfers_history + [transfer],
                        "scheduled": current_state.data.get("transfers", {}).get("scheduled", [])
                    }
                },
                note=f"Transfer via API: {reference_number}"
            ),
            user_id
        )
    else:
        # For scheduled/recurring transfers, add to scheduled list
        transfers_history = current_state.data.get("transfers", {}).get("history", [])
        scheduled_transfers = current_state.data.get("transfers", {}).get("scheduled", [])
        await patch_state(
            StatePatchRequest(
                data={
                    "transfers": {
                        "history": transfers_history,
                        "scheduled": scheduled_transfers + [transfer]
                    }
                },
                note=f"Scheduled {payload.frequency} transfer via API"
            ),
            user_id
        )

    is_scheduled = payload.frequency != "once" or payload.scheduled_date
    return TransferResponse(
        success=True,
        transfer_id=transfer_id,
        reference_number=reference_number,
        message=f"Transfer {'scheduled' if is_scheduled else 'completed'} successfully"
    )


@app.post(
    f"{settings.api_prefix}/payment",
    response_model=PaymentResponse,
    tags=["convenience"],
    summary="Process a bill or credit card payment",
)
async def execute_payment(
    payload: PaymentRequest,
    user_id: str = Depends(get_user_id)
) -> PaymentResponse:
    """Process a payment to a payee or credit card."""
    # Get current state
    state_response = await get_state(user_id)
    current_state = state_response.state

    # Validate amount
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")

    # Validate payment type
    if payload.payment_type not in ["bill", "credit_card"]:
        raise HTTPException(status_code=400, detail="payment_type must be 'bill' or 'credit_card'")

    # Validate required fields based on payment type
    if payload.payment_type == "bill" and not payload.payee_id:
        raise HTTPException(status_code=400, detail="payee_id required for bill payments")
    if payload.payment_type == "credit_card" and not payload.credit_card_id:
        raise HTTPException(status_code=400, detail="credit_card_id required for credit card payments")

    # Find from account
    accounts = current_state.data.get("accounts", [])
    from_account = None
    for account in accounts:
        if account["id"] == payload.from_account_id:
            from_account = account
            break

    if not from_account:
        raise HTTPException(status_code=404, detail="Source account not found")

    # Check sufficient funds
    if payload.amount > from_account.get("available_balance", 0):
        raise HTTPException(status_code=400, detail="Insufficient funds in source account")

    # Create payment record
    payment_id = f"payment_{uuid.uuid4().hex[:12]}"
    reference_number = f"PMT{str(int((1e9 - 1) * (hash(payment_id) % 1e9) / 1e9) + 1e8)}"[:12]

    payment = {
        "id": payment_id,
        "from_account_id": payload.from_account_id,
        "amount": payload.amount,
        "date": payload.scheduled_date or None,
        "status": "pending" if payload.scheduled_date else "completed",
        "reference_number": reference_number,
        "memo": payload.memo,
    }

    # Add destination info based on payment type
    if payload.payment_type == "bill":
        # Find payee
        payees = current_state.data.get("bill_pay", {}).get("payees", [])
        payee = None
        for p in payees:
            if p["id"] == payload.payee_id:
                payee = p
                break

        if not payee:
            raise HTTPException(status_code=404, detail="Payee not found")

        payment["payee_id"] = payload.payee_id
        payment["payee_name"] = payee.get("name", "Unknown")
        payment_type_desc = f"Bill payment to {payee.get('name', 'Unknown')}"

        # Add to bill pay history
        bill_pay_history = current_state.data.get("bill_pay", {}).get("payment_history", [])
    else:
        # Find credit card
        credit_cards = current_state.data.get("credit_cards", [])
        credit_card = None
        for cc in credit_cards:
            if cc["id"] == payload.credit_card_id:
                credit_card = cc
                break

        if not credit_card:
            raise HTTPException(status_code=404, detail="Credit card not found")

        payment["credit_card_id"] = payload.credit_card_id
        payment["card_number"] = credit_card.get("card_number", "Unknown")
        payment_type_desc = f"Credit card payment ending in {credit_card.get('card_number', 'Unknown')}"

        # Add to credit card payment history
        bill_pay_history = current_state.data.get("bill_pay", {}).get("payment_history", [])

    # For immediate payments, update account balances
    if not payload.scheduled_date:
        now = datetime.utcnow()
        updated_accounts = []
        for account in accounts:
            if account["id"] == payload.from_account_id:
                new_balance = account["current_balance"] - payload.amount
                new_available = account["available_balance"] - payload.amount
                currency = account.get("currency", "USD")
                transaction = {
                    "id": f"tx_{uuid.uuid4().hex[:12]}",
                    "date": now.isoformat(),
                    "post_date": (now + timedelta(days=1)).isoformat(),
                    "transaction_time": now.strftime("%H:%M:%S"),
                    "description": payment_type_desc,
                    "amount": -payload.amount,
                    "transaction_amount": payload.amount,
                    "billing_amount": payload.amount,
                    "transaction_currency": currency,
                    "billing_currency": currency,
                    "running_balance": new_balance,
                    "category": "Payment",
                    "type": "debit",
                    "merchant_name": payment_type_desc,
                    "area_district": "Online",
                    "country_region": "United States",
                    "card_number": account.get("account_number"),
                }
                account["current_balance"] = new_balance
                account["available_balance"] = new_available
                account.setdefault("transactions", []).insert(0, transaction)

            updated_accounts.append(account)

        # Update credit card balance if applicable
        credit_cards = current_state.data.get("credit_cards", [])
        updated_credit_cards = []
        if payload.payment_type == "credit_card":
            for cc in credit_cards:
                if cc["id"] == payload.credit_card_id:
                    new_balance = cc.get("current_balance", 0) - payload.amount
                    cc["current_balance"] = max(0, new_balance)
                updated_credit_cards.append(cc)
        else:
            updated_credit_cards = credit_cards

        # Update state
        await patch_state(
            StatePatchRequest(
                data={
                    "accounts": updated_accounts,
                    "credit_cards": updated_credit_cards,
                    "bill_pay": {
                        "payees": current_state.data.get("bill_pay", {}).get("payees", []),
                        "scheduled_payments": current_state.data.get("bill_pay", {}).get("scheduled_payments", []),
                        "payment_history": bill_pay_history + [payment]
                    }
                },
                note=f"Payment via API: {reference_number}"
            ),
            user_id
        )
    else:
        # For scheduled payments, add to scheduled list
        if payload.payment_type == "bill":
            scheduled_payment = {
                "id": payment_id,
                "payee_id": payload.payee_id,
                "amount": payload.amount,
                "frequency": "once",
                "next_date": payload.scheduled_date,
                "from_account_id": payload.from_account_id,
                "status": "active"
            }
            scheduled_payments = current_state.data.get("bill_pay", {}).get("scheduled_payments", [])
            await patch_state(
                StatePatchRequest(
                    data={
                        "bill_pay": {
                            "payees": current_state.data.get("bill_pay", {}).get("payees", []),
                            "scheduled_payments": scheduled_payments + [scheduled_payment],
                            "payment_history": bill_pay_history
                        }
                    },
                    note=f"Scheduled payment via API"
                ),
                user_id
            )

    is_scheduled = bool(payload.scheduled_date)
    return PaymentResponse(
        success=True,
        payment_id=payment_id,
        reference_number=reference_number,
        message=f"Payment {'scheduled' if is_scheduled else 'completed'} successfully"
    )


class AccountSummary(BaseModel):
    id: str
    type: str
    nickname: Optional[str]
    account_number: str
    current_balance: float
    available_balance: float


@app.get(
    f"{settings.api_prefix}/accounts",
    response_model=List[AccountSummary],
    tags=["convenience"],
    summary="Get account summary",
)
async def get_accounts(
    user_id: str = Depends(get_user_id)
) -> List[AccountSummary]:
    """Return summary of all accounts."""
    state_response = await get_state(user_id)
    accounts = state_response.state.data.get("accounts", [])

    return [
        AccountSummary(
            id=acc["id"],
            type=acc["type"],
            nickname=acc.get("nickname"),
            account_number=acc["account_number"],
            current_balance=acc["current_balance"],
            available_balance=acc.get("available_balance", 0)
        )
        for acc in accounts
    ]


# Mount MCP Streamable HTTP app at /mcp for remote access
app.mount("/mcp", mcp_http_app)
