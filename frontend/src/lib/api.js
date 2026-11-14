// Resolution order: window.__API_BASE_URL__ (injected at container start by
// docker-entrypoint.sh from the API_BASE_URL env var - see Dockerfile) takes
// priority so a prebuilt image can be repointed without rebuilding, then the
// Vite build-time env var for `npm run dev`, then a hardcoded fallback. It
// defaults to 18080 because Windows/WSL2 had claimed 8080-8083 as a dynamic
// port exclusion range on the dev machine this was built on.
// `??` (not `||`) so an empty string is kept: "" = same origin, i.e. requests
// go to /api/... on the host that served the page (used behind the AWS ALB).
const BASE_URL =
  window.__API_BASE_URL__ ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:18080";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let currentAccessToken = null;
export function setAccessToken(token) {
  currentAccessToken = token;
}

// Lets AuthProvider react to "token expired/invalid" without api.js needing
// to know anything about React or the auth context.
let unauthorizedHandler = () => {};
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && currentAccessToken) {
    headers.Authorization = `Bearer ${currentAccessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed with status ${res.status}`;
    if (res.status === 401 && auth) {
      unauthorizedHandler();
    }
    throw new ApiError(res.status, message);
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request("/api/v1/auth/login", { method: "POST", body: { username, password }, auth: false }),
  register: (username, email, password) =>
    request("/api/v1/auth/register", { method: "POST", body: { username, email, password }, auth: false }),

  listItems: () => request("/api/v1/items"),
  createItem: (item) => request("/api/v1/items", { method: "POST", body: item }),
  getStock: (itemId) => request(`/api/v1/stock/${itemId}`),
  // One request, counted in the database - replaces fetching every item's
  // stock record individually (an N+1 over HTTP) on the dashboard.
  getStockSummary: (lowStockThreshold = 10) =>
    request(`/api/v1/stock/summary?lowStockThreshold=${lowStockThreshold}`),

  // Pricing lives in master-data-service, not on the item itself - see
  // README "What's actually demonstrated here" for why (sales-service
  // resolves price server-side rather than trusting the client).
  getPrice: (itemId) => request(`/api/v1/prices/${itemId}`),
  setPrice: (itemId, unitPrice) => request("/api/v1/prices", { method: "POST", body: { itemId, unitPrice } }),

  listOrders: () => request("/api/v1/orders?size=200"),
  // Dashboard / top bar: only the newest few, plus totalElements for the count.
  listRecentOrders: (size = 8) => request(`/api/v1/orders?size=${size}&sort=createdAt,desc`),
  getOrder: (orderId) => request(`/api/v1/orders/${orderId}`),
  createOrder: (order) => request("/api/v1/orders", { method: "POST", body: order }),

  listCustomers: () => request("/api/v1/customers?size=100"),
  countCustomers: () => request("/api/v1/customers?size=1").then((p) => p?.totalElements ?? 0),
  createCustomer: (customer) => request("/api/v1/customers", { method: "POST", body: customer }),

  listVendors: () => request("/api/v1/vendors?size=100"),
  createVendor: (vendor) => request("/api/v1/vendors", { method: "POST", body: vendor }),

  // A CQRS read model: reporting-service consumes OrderPlaced/OrderFailed off
  // Kafka and maintains this projection incrementally, so this is one indexed
  // row per month instead of the dashboard re-summing every order on every
  // load (which is what it did before reporting-service existed).
  getRevenueSummary: () => request("/api/v1/reports/revenue-summary"),
  getInventoryEvents: () => request("/api/v1/reports/inventory-events?size=50"),

  listPurchaseOrders: () => request("/api/v1/purchase-orders?size=100"),
  getPurchaseOrder: (id) => request(`/api/v1/purchase-orders/${id}`),
  createPurchaseOrder: (po) => request("/api/v1/purchase-orders", { method: "POST", body: po }),
  submitPurchaseOrder: (id) => request(`/api/v1/purchase-orders/${id}/submit`, { method: "POST" }),
  receivePurchaseOrder: (id) => request(`/api/v1/purchase-orders/${id}/receive`, { method: "POST" }),

  // finance-service's ledger - a real double-entry projection built off
  // sales-events/procurement-events, not sample numbers.
  getFinanceSummary: () => request("/api/v1/finance/summary"),
  getLedger: () => request("/api/v1/finance/ledger?size=50"),
};
