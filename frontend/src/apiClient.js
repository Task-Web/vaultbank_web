const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.detail || response.statusText || "Request failed";
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  baseUrl: API_BASE,
  getDashboard: () => request("/vaultbank/dashboard"),
  executeTransfer: (payload) =>
    request("/transfer", { method: "POST", body: JSON.stringify(payload) }),
  makePayment: (payload) =>
    request("/payment", { method: "POST", body: JSON.stringify(payload) }),
  cancelTransfer: (transferId) =>
    request(`/vaultbank/transfers/${encodeURIComponent(transferId)}`, { method: "DELETE" }),
  cancelPayment: (paymentId) =>
    request(`/vaultbank/payments/${encodeURIComponent(paymentId)}`, { method: "DELETE" }),
  updateProfile: (payload) =>
    request("/vaultbank/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  setCardFrozen: (cardId, frozen) =>
    request(`/vaultbank/cards/${encodeURIComponent(cardId)}/freeze`, {
      method: "PUT",
      body: JSON.stringify({ frozen }),
    }),
  payCard: (cardId, payload) =>
    request(`/vaultbank/cards/${encodeURIComponent(cardId)}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createPayee: (payload) =>
    request("/vaultbank/payees", { method: "POST", body: JSON.stringify(payload) }),
  updatePayee: (payeeId, payload) =>
    request(`/vaultbank/payees/${encodeURIComponent(payeeId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deletePayee: (payeeId) =>
    request(`/vaultbank/payees/${encodeURIComponent(payeeId)}`, { method: "DELETE" }),
  executeTrade: (accountType, payload) =>
    request(`/vaultbank/investments/${encodeURIComponent(accountType)}/trades`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  applyForLoan: (payload) =>
    request("/vaultbank/loans", { method: "POST", body: JSON.stringify(payload) }),
  payLoan: (loanId, payload) =>
    request(`/vaultbank/loans/${encodeURIComponent(loanId)}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createMobileDeposit: (payload) =>
    request("/vaultbank/mobile-deposits", { method: "POST", body: JSON.stringify(payload) }),
  getInfo: () => request("/info"),
  listFiles: () => request("/files"),
  uploadFiles: (files = []) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return request("/files", { method: "POST", body: formData });
  },
};
