import mimetypes
import os
import platform
import uuid
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Literal, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from mcp.server.fastmcp import FastMCP

from .config import Settings, get_settings
from .file_store import FileStore
from .schemas import FileMetadata, InfoResponse, StatePatchRequest, StateRequest, StateResponse
from .state_store import StateStore
from pydantic import BaseModel, ConfigDict, Field

settings = get_settings()
store = StateStore()
file_store = FileStore("files", settings.api_prefix)

tags_metadata = [
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
@app.get(
    f"{settings.api_prefix}/state",
    response_model=StateResponse,
    tags=["state"],
    include_in_schema=False,
)
async def get_state(user_id: str = Depends(get_user_id)) -> StateResponse:
    state = await store.get_state(user_id)
    return StateResponse(user_id=user_id, state=state)


@app.put(
    f"{settings.api_prefix}/state",
    response_model=StateResponse,
    tags=["state"],
    summary="Replace state",
    include_in_schema=False,
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
    include_in_schema=False,
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
    include_in_schema=False,
)
async def delete_state(user_id: str = Depends(get_user_id)) -> StateResponse:
    file_store.delete_user_files(user_id)
    state = await store.reset_state(user_id)
    return StateResponse(user_id=user_id, state=state)


VAULTBANK_PRODUCT_KEYS = (
    "accounts",
    "credit_cards",
    "loans",
    "investments",
    "bill_pay",
    "transfers",
    "user_profile",
    "mobile_deposits",
)


def _vaultbank_projection(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "data": {key: data.get(key) for key in VAULTBANK_PRODUCT_KEYS},
    }


@app.get(f"{settings.api_prefix}/vaultbank/dashboard", tags=["vaultbank"])
async def get_vaultbank_dashboard(user_id: str = Depends(get_user_id)) -> Dict[str, Any]:
    state = await store.get_state(user_id)
    return _vaultbank_projection(user_id, state.data)


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
class ProductRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TransferRequest(ProductRequest):
    from_account_id: str
    to_account_id: Optional[str] = None
    amount: float = Field(gt=0)
    transfer_type: Literal["internal", "external"] = "internal"
    frequency: Literal["once", "weekly", "monthly"] = "once"
    scheduled_date: Optional[str] = None
    memo: Optional[str] = None
    # External transfer fields
    external_account_name: Optional[str] = None
    external_account_number: Optional[str] = None
    external_routing_number: Optional[str] = None
    external_account_type: Optional[Literal["checking", "savings"]] = "checking"


class TransferResponse(BaseModel):
    success: bool
    transfer_id: str
    reference_number: str
    message: str


class PaymentRequest(ProductRequest):
    from_account_id: str
    amount: float = Field(gt=0)
    payment_type: Literal["bill", "credit_card"]
    payee_id: Optional[str] = None
    credit_card_id: Optional[str] = None
    scheduled_date: Optional[str] = None
    frequency: Literal["once", "weekly", "monthly"] = "once"
    memo: Optional[str] = None


class PaymentResponse(BaseModel):
    success: bool
    payment_id: str
    reference_number: str
    message: str


class AddressRequest(ProductRequest):
    street: str
    city: str
    state: str
    zip: str


class CommunicationPreferencesRequest(ProductRequest):
    paperless: bool
    email_notifications: bool
    sms_notifications: bool


class ProfileUpdateRequest(ProductRequest):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[AddressRequest] = None
    communication_preferences: Optional[CommunicationPreferencesRequest] = None


class CardFreezeRequest(ProductRequest):
    frozen: bool


class CardPaymentRequest(ProductRequest):
    account_id: str
    amount: float = Field(gt=0)


class PayeeRequest(ProductRequest):
    name: str
    account_number: str
    address: str
    nickname: Optional[str] = None


class InvestmentTradeRequest(ProductRequest):
    symbol: str
    trade_type: Literal["buy", "sell"]
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)


class LoanApplicationRequest(ProductRequest):
    loan_type: Literal["auto", "mortgage", "personal"]
    amount: float = Field(gt=0)
    term_months: int = Field(ge=12, le=360)


class LoanPaymentRequest(ProductRequest):
    account_id: str
    amount: float = Field(gt=0)


class MobileDepositRequest(ProductRequest):
    account_id: str
    amount: float = Field(gt=0)
    front_image: str
    back_image: str


@app.patch(f"{settings.api_prefix}/vaultbank/profile", tags=["vaultbank"])
async def update_vaultbank_profile(
    payload: ProfileUpdateRequest, user_id: str = Depends(get_user_id)
) -> Dict[str, Any]:
    values = payload.model_dump(exclude_none=True)
    if not values:
        raise HTTPException(status_code=422, detail="At least one profile field is required")

    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        profile = data.setdefault("user_profile", {})
        for key, value in values.items():
            if isinstance(value, dict) and isinstance(profile.get(key), dict):
                profile[key] = {**profile[key], **value}
            else:
                profile[key] = value
        return data

    state = await store.mutate_data(user_id, mutate, "Updated VaultBank profile")
    return _vaultbank_projection(user_id, state.data)


@app.put(f"{settings.api_prefix}/vaultbank/cards/{{card_id}}/freeze", tags=["vaultbank"])
async def set_vaultbank_card_freeze(
    card_id: str,
    payload: CardFreezeRequest,
    user_id: str = Depends(get_user_id),
) -> Dict[str, Any]:
    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        card = next((item for item in data.get("credit_cards", []) if item.get("id") == card_id), None)
        if card is None:
            raise HTTPException(status_code=404, detail="Credit card not found")
        card["card_frozen"] = payload.frozen
        return data

    state = await store.mutate_data(user_id, mutate, "Updated card freeze status")
    return _vaultbank_projection(user_id, state.data)


@app.post(f"{settings.api_prefix}/vaultbank/cards/{{card_id}}/payments", tags=["vaultbank"])
async def pay_vaultbank_card(
    card_id: str,
    payload: CardPaymentRequest,
    user_id: str = Depends(get_user_id),
) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()

    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        card = next((item for item in data.get("credit_cards", []) if item.get("id") == card_id), None)
        account = next(
            (item for item in data.get("accounts", []) if item.get("id") == payload.account_id),
            None,
        )
        if card is None:
            raise HTTPException(status_code=404, detail="Credit card not found")
        if account is None:
            raise HTTPException(status_code=404, detail="Source account not found")
        if payload.amount > float(account.get("available_balance", 0)):
            raise HTTPException(status_code=409, detail="Insufficient funds")
        card["current_balance"] = max(0, float(card.get("current_balance", 0)) - payload.amount)
        card.setdefault("transactions", []).insert(
            0,
            {
                "id": f"cardpay_{uuid.uuid4().hex[:12]}",
                "date": now,
                "post_date": now,
                "description": "Online Payment",
                "amount": payload.amount,
                "transaction_amount": payload.amount,
                "billing_amount": payload.amount,
                "transaction_currency": "USD",
                "billing_currency": "USD",
                "card_number": card.get("card_number"),
                "category": "Payment",
                "type": "credit",
            },
        )
        account["current_balance"] -= payload.amount
        account["available_balance"] -= payload.amount
        account.setdefault("transactions", []).insert(
            0,
            {
                "id": f"txn_{uuid.uuid4().hex[:12]}",
                "date": now,
                "post_date": now,
                "description": f"Credit Card Payment - {card.get('card_number', '')}",
                "amount": -payload.amount,
                "transaction_amount": payload.amount,
                "billing_amount": payload.amount,
                "transaction_currency": account.get("currency", "USD"),
                "billing_currency": account.get("currency", "USD"),
                "card_number": account.get("account_number"),
                "category": "Payment",
                "type": "debit",
                "running_balance": account["current_balance"],
            },
        )
        return data

    state = await store.mutate_data(user_id, mutate, "Processed credit card payment")
    return _vaultbank_projection(user_id, state.data)


@app.post(f"{settings.api_prefix}/vaultbank/payees", tags=["vaultbank"])
async def create_vaultbank_payee(
    payload: PayeeRequest, user_id: str = Depends(get_user_id)
) -> Dict[str, Any]:
    payee = {"id": f"payee_{uuid.uuid4().hex[:12]}", **payload.model_dump(exclude_none=True)}

    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        data.setdefault("bill_pay", {}).setdefault("payees", []).append(payee)
        return data

    state = await store.mutate_data(user_id, mutate, "Added payee")
    return {"user_id": user_id, "payee": payee, "data": _vaultbank_projection(user_id, state.data)["data"]}


@app.patch(f"{settings.api_prefix}/vaultbank/payees/{{payee_id}}", tags=["vaultbank"])
async def update_vaultbank_payee(
    payee_id: str,
    payload: PayeeRequest,
    user_id: str = Depends(get_user_id),
) -> Dict[str, Any]:
    values = payload.model_dump(exclude_none=True)

    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        payee = next(
            (item for item in data.setdefault("bill_pay", {}).setdefault("payees", []) if item.get("id") == payee_id),
            None,
        )
        if payee is None:
            raise HTTPException(status_code=404, detail="Payee not found")
        payee.update(values)
        return data

    state = await store.mutate_data(user_id, mutate, "Updated payee")
    return _vaultbank_projection(user_id, state.data)


@app.delete(f"{settings.api_prefix}/vaultbank/payees/{{payee_id}}", tags=["vaultbank"])
async def delete_vaultbank_payee(
    payee_id: str, user_id: str = Depends(get_user_id)
) -> Dict[str, Any]:
    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        bill_pay = data.setdefault("bill_pay", {})
        payees = bill_pay.setdefault("payees", [])
        if not any(item.get("id") == payee_id for item in payees):
            raise HTTPException(status_code=404, detail="Payee not found")
        if any(item.get("payee_id") == payee_id for item in bill_pay.get("scheduled_payments", [])):
            raise HTTPException(status_code=409, detail="Payee has a scheduled payment")
        bill_pay["payees"] = [item for item in payees if item.get("id") != payee_id]
        return data

    state = await store.mutate_data(user_id, mutate, "Deleted payee")
    return _vaultbank_projection(user_id, state.data)


@app.delete(f"{settings.api_prefix}/vaultbank/transfers/{{transfer_id}}", tags=["vaultbank"])
async def cancel_vaultbank_transfer(
    transfer_id: str, user_id: str = Depends(get_user_id)
) -> Dict[str, Any]:
    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        transfers = data.setdefault("transfers", {}).setdefault("scheduled", [])
        if not any(item.get("id") == transfer_id for item in transfers):
            raise HTTPException(status_code=404, detail="Scheduled transfer not found")
        data["transfers"]["scheduled"] = [item for item in transfers if item.get("id") != transfer_id]
        return data

    state = await store.mutate_data(user_id, mutate, "Cancelled scheduled transfer")
    return _vaultbank_projection(user_id, state.data)


@app.delete(f"{settings.api_prefix}/vaultbank/payments/{{payment_id}}", tags=["vaultbank"])
async def cancel_vaultbank_payment(
    payment_id: str, user_id: str = Depends(get_user_id)
) -> Dict[str, Any]:
    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        payments = data.setdefault("bill_pay", {}).setdefault("scheduled_payments", [])
        if not any(item.get("id") == payment_id for item in payments):
            raise HTTPException(status_code=404, detail="Scheduled payment not found")
        data["bill_pay"]["scheduled_payments"] = [
            item for item in payments if item.get("id") != payment_id
        ]
        return data

    state = await store.mutate_data(user_id, mutate, "Cancelled scheduled payment")
    return _vaultbank_projection(user_id, state.data)


def _investment_account(data: Dict[str, Any], account_type: str) -> Dict[str, Any]:
    investments = data.setdefault("investments", {})
    if account_type == "brokerage":
        return investments.setdefault("brokerage", {})
    account = next(
        (item for item in investments.setdefault("retirement", []) if item.get("account_type") == account_type),
        None,
    )
    if account is None:
        raise HTTPException(status_code=404, detail="Investment account not found")
    return account


@app.post(f"{settings.api_prefix}/vaultbank/investments/{{account_type}}/trades", tags=["vaultbank"])
async def execute_vaultbank_trade(
    account_type: str,
    payload: InvestmentTradeRequest,
    user_id: str = Depends(get_user_id),
) -> Dict[str, Any]:
    total = payload.quantity * payload.price
    trade = {
        "id": f"trade_{uuid.uuid4().hex[:12]}",
        "symbol": payload.symbol,
        "type": payload.trade_type,
        "quantity": payload.quantity,
        "price": payload.price,
        "total": total,
        "date": datetime.utcnow().isoformat(),
    }

    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        account = _investment_account(data, account_type)
        holdings = account.setdefault("holdings", [])
        holding = next((item for item in holdings if item.get("symbol") == payload.symbol), None)
        cash = float(account.get("cash_balance", 0))
        if payload.trade_type == "buy":
            if total > cash:
                raise HTTPException(status_code=409, detail="Insufficient investment cash")
            if holding is None:
                holding = {
                    "symbol": payload.symbol,
                    "name": payload.symbol,
                    "quantity": 0,
                    "average_cost": payload.price,
                    "current_price": payload.price,
                    "current_value": 0,
                    "gain_loss": 0,
                    "gain_loss_percent": 0,
                }
                holdings.append(holding)
            old_quantity = float(holding.get("quantity", 0))
            old_cost = float(holding.get("average_cost", 0)) * old_quantity
            new_quantity = old_quantity + payload.quantity
            holding["quantity"] = new_quantity
            holding["average_cost"] = (old_cost + total) / new_quantity
            holding["current_value"] = new_quantity * float(holding.get("current_price", payload.price))
            account["cash_balance"] = cash - total
        else:
            if holding is None or float(holding.get("quantity", 0)) < payload.quantity:
                raise HTTPException(status_code=409, detail="Insufficient shares")
            holding["quantity"] = float(holding["quantity"]) - payload.quantity
            account["cash_balance"] = cash + total
            if holding["quantity"] == 0:
                holdings.remove(holding)
            else:
                holding["current_value"] = holding["quantity"] * float(
                    holding.get("current_price", payload.price)
                )
        account.setdefault("trades", []).insert(0, trade)
        account["total_value"] = float(account.get("cash_balance", 0)) + sum(
            float(item.get("current_value", 0)) for item in holdings
        )
        return data

    state = await store.mutate_data(user_id, mutate, "Executed investment trade")
    return {"user_id": user_id, "trade": trade, "data": _vaultbank_projection(user_id, state.data)["data"]}


@app.post(f"{settings.api_prefix}/vaultbank/loans", tags=["vaultbank"])
async def apply_for_vaultbank_loan(
    payload: LoanApplicationRequest, user_id: str = Depends(get_user_id)
) -> Dict[str, Any]:
    rate = {"auto": 4.5, "mortgage": 6.25, "personal": 7.5}[payload.loan_type]
    monthly_rate = rate / 100 / 12
    monthly_payment = (
        payload.amount * monthly_rate * (1 + monthly_rate) ** payload.term_months
    ) / ((1 + monthly_rate) ** payload.term_months - 1)
    now = datetime.utcnow()
    balance = payload.amount
    schedule = []
    for index in range(1, min(payload.term_months, 60) + 1):
        interest = balance * monthly_rate
        principal = monthly_payment - interest
        balance -= principal
        schedule.append(
            {
                "date": (now + timedelta(days=30 * index)).isoformat(),
                "amount": monthly_payment,
                "principal": principal,
                "interest": interest,
                "remaining_balance": max(0, balance),
                "status": "paid" if index <= 12 else ("pending" if index == 13 else "scheduled"),
            }
        )
    loan = {
        "id": f"loan_{payload.loan_type}_{uuid.uuid4().hex[:10]}",
        "type": payload.loan_type,
        "loan_number": f"{payload.loan_type[:2].upper()}-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}",
        "original_amount": payload.amount,
        "current_balance": payload.amount,
        "interest_rate": rate,
        "monthly_payment": monthly_payment,
        "due_date": (now + timedelta(days=30)).isoformat(),
        "start_date": now.isoformat(),
        "maturity_date": (now + timedelta(days=30 * payload.term_months)).isoformat(),
        "payment_schedule": schedule,
        "payment_history": [],
        "status": "in_application",
    }

    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        data.setdefault("loans", []).append(loan)
        return data

    state = await store.mutate_data(user_id, mutate, "Submitted loan application")
    return {"user_id": user_id, "loan": loan, "data": _vaultbank_projection(user_id, state.data)["data"]}


@app.post(f"{settings.api_prefix}/vaultbank/loans/{{loan_id}}/payments", tags=["vaultbank"])
async def pay_vaultbank_loan(
    loan_id: str,
    payload: LoanPaymentRequest,
    user_id: str = Depends(get_user_id),
) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()

    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        loan = next((item for item in data.get("loans", []) if item.get("id") == loan_id), None)
        account = next(
            (item for item in data.get("accounts", []) if item.get("id") == payload.account_id),
            None,
        )
        if loan is None:
            raise HTTPException(status_code=404, detail="Loan not found")
        if account is None:
            raise HTTPException(status_code=404, detail="Source account not found")
        if payload.amount > float(account.get("available_balance", 0)):
            raise HTTPException(status_code=409, detail="Insufficient funds")
        if payload.amount > float(loan.get("current_balance", 0)):
            raise HTTPException(status_code=409, detail="Payment exceeds loan balance")
        loan["current_balance"] = max(0, float(loan["current_balance"]) - payload.amount)
        loan.setdefault("payment_history", []).insert(
            0, {"id": f"loanpay_{uuid.uuid4().hex[:12]}", "date": now, "amount": payload.amount}
        )
        account["current_balance"] -= payload.amount
        account["available_balance"] -= payload.amount
        return data

    state = await store.mutate_data(user_id, mutate, "Applied extra loan payment")
    return _vaultbank_projection(user_id, state.data)


@app.post(f"{settings.api_prefix}/vaultbank/mobile-deposits", tags=["vaultbank"])
async def create_vaultbank_mobile_deposit(
    payload: MobileDepositRequest, user_id: str = Depends(get_user_id)
) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    deposit = {
        "id": f"deposit_{uuid.uuid4().hex[:12]}",
        "account_id": payload.account_id,
        "amount": payload.amount,
        "front_image": payload.front_image,
        "back_image": payload.back_image,
        "date": now,
        "status": "completed",
        "reference_number": f"MD{uuid.uuid4().hex[:10].upper()}",
    }

    def mutate(data: Dict[str, Any]) -> Dict[str, Any]:
        account = next(
            (item for item in data.get("accounts", []) if item.get("id") == payload.account_id),
            None,
        )
        if account is None:
            raise HTTPException(status_code=404, detail="Deposit account not found")
        account["current_balance"] += payload.amount
        account["available_balance"] += payload.amount
        account.setdefault("transactions", []).insert(
            0,
            {
                "id": f"txn_{uuid.uuid4().hex[:12]}",
                "date": now,
                "post_date": now,
                "description": "Mobile Deposit",
                "amount": payload.amount,
                "type": "credit",
                "category": "Deposit",
                "running_balance": account["current_balance"],
            },
        )
        data.setdefault("mobile_deposits", []).append(deposit)
        return data

    state = await store.mutate_data(user_id, mutate, "Mobile deposit processed")
    return {"user_id": user_id, "deposit": deposit, "data": _vaultbank_projection(user_id, state.data)["data"]}


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

    is_scheduled = payload.frequency != "once" or bool(payload.scheduled_date)
    transfer = {
        "id": transfer_id,
        "from_account_id": payload.from_account_id,
        "amount": payload.amount,
        "date": payload.scheduled_date or datetime.utcnow().isoformat(),
        "status": "pending" if is_scheduled else "completed",
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

    is_scheduled = payload.frequency != "once" or bool(payload.scheduled_date)
    payment_date = payload.scheduled_date or datetime.utcnow().isoformat()
    payment = {
        "id": payment_id,
        "from_account_id": payload.from_account_id,
        "amount": payload.amount,
        "date": payment_date,
        "status": "active" if is_scheduled else "completed",
        "frequency": payload.frequency,
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
        payment["from_account_name"] = from_account.get("nickname", "Account")
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
    if not is_scheduled:
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
                **payment,
                "next_date": payment_date,
            }
            scheduled_payments = current_state.data.get("bill_pay", {}).get("scheduled_payments", [])
            await patch_state(
                StatePatchRequest(
                    data={
                        "bill_pay": {
                            "payees": current_state.data.get("bill_pay", {}).get("payees", []),
                            "scheduled_payments": scheduled_payments + [scheduled_payment],
                            "payment_history": bill_pay_history + [payment]
                        }
                    },
                    note=f"Scheduled payment via API"
                ),
                user_id
            )

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
