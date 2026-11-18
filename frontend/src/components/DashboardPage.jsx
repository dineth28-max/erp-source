import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import AreaChart from "./charts/AreaChart.jsx";
import {
  RefreshIcon, ArrowUpRightIcon, ArrowDownRightIcon, CheckCircleIcon, ClockIcon, XCircleIcon, AlertIcon,
  ChevronRightIcon, DollarIcon,
} from "./icons.jsx";

// ---------------------------------------------------------------- formatting
const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const moneyCompact = new Intl.NumberFormat(undefined, {
  style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
});
const count = new Intl.NumberFormat();
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** Big figures auto-compact ($48.2K), small ones stay exact ($912.50). */
const fmtMoney = (v) => (Math.abs(v) >= 10000 ? moneyCompact.format(v) : money.format(v));
const plural = (n, one, many) => `${count.format(n)} ${n === 1 ? one : many}`;

function timeAgo(iso) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86400) return relative.format(Math.round(seconds / 86400), "day");
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

// reporting-service buckets revenue by UTC calendar month ("2026-11")
const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const monthName = (d, style = "long") => d.toLocaleDateString(undefined, { month: style, timeZone: "UTC" });

/**
 * The last 12 calendar months, oldest first, with empty months filled in as
 * zero so the time axis is honest (the API only returns months that had sales).
 */
function lastTwelveMonths(summary) {
  const byMonth = new Map(summary.map((m) => [m.yearMonth, m]));
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    const row = byMonth.get(monthKey(date));
    return {
      date,
      revenue: Number(row?.confirmedRevenue ?? 0),
      confirmed: row?.confirmedOrders ?? 0,
      failed: row?.failedOrders ?? 0,
    };
  });
}

const ORDER_STATUS = {
  CONFIRMED: { label: "Confirmed", icon: CheckCircleIcon, pill: "bg-ok-wash text-ok-ink" },
  PENDING: { label: "Pending", icon: ClockIcon, pill: "bg-warn-wash text-warn-ink" },
  CANCELLED: { label: "Cancelled", icon: XCircleIcon, pill: "bg-slate-100 text-slate-600" },
  FAILED: { label: "Failed", icon: XCircleIcon, pill: "bg-bad-wash text-bad-ink" },
};

// inventory-service event names -> what happened to the stock, in plain words
const MOVEMENT = {
  StockReceived: { label: "Received", tone: "text-ok-ink", sign: "+" },
  StockReleased: { label: "Returned to stock", tone: "text-ok-ink", sign: "+" },
  StockReserved: { label: "Reserved for an order", tone: "text-slate-600", sign: "−" },
  StockConfirmed: { label: "Sold", tone: "text-slate-600", sign: "" },
  StockReservationFailed: { label: "Not enough stock", tone: "text-bad-ink", sign: "" },
};
const movementOf = (type) =>
  MOVEMENT[type] ?? { label: (type ?? "Stock change").replace(/([a-z])([A-Z])/g, "$1 $2"), tone: "text-slate-600", sign: "" };

// ------------------------------------------------------------------ loading
async function loadDashboard() {
  const [revenue, orders, customers, stock, finance, events] = await Promise.allSettled([
    api.getRevenueSummary(),
    api.listRecentOrders(6),
    api.countCustomers(),
    api.getStockSummary(10),
    api.getFinanceSummary(),
    api.getInventoryEvents(),
  ]);
  const ok = (r) => (r.status === "fulfilled" ? r.value : null);
  return {
    revenue: ok(revenue),
    orders: ok(orders),
    customers: ok(customers),
    stock: ok(stock),
    finance: ok(finance),
    events: ok(events),
    loadedAt: new Date(),
  };
}

/** Problems worth acting on today, most urgent first. */
function attentionItems(data, months) {
  const items = [];
  const thisMonth = months.at(-1);

  if (thisMonth?.failed > 0) {
    items.push({
      tone: "bad",
      title: `${plural(thisMonth.failed, "order", "orders")} failed this month`,
      detail: "Open each one to see why, then place it again.",
      action: "Review orders",
      page: "orders",
    });
  }
  if (data.stock?.outOfStock > 0) {
    items.push({
      tone: "bad",
      title: `${plural(data.stock.outOfStock, "item is", "items are")} out of stock`,
      detail: "Customers can't order these until you restock.",
      action: "Order stock",
      page: "procurement",
    });
  }
  if (data.stock?.lowStock > 0) {
    items.push({
      tone: "warn",
      title: `${plural(data.stock.lowStock, "item is", "items are")} running low`,
      detail: "10 units or fewer left.",
      action: "View items",
      page: "items",
    });
  }
  if (Number(data.finance?.accountsReceivable) > 0) {
    items.push({
      tone: "info",
      title: `Customers owe you ${fmtMoney(Number(data.finance.accountsReceivable))}`,
      detail: "Unpaid amounts on the ledger.",
      action: "Open finance",
      page: "finance",
    });
  }

  const missing = [!data.revenue && "sales", !data.stock && "stock levels"].filter(Boolean);
  if (missing.length) {
    items.push({
      tone: "info",
      title: `Couldn't check ${missing.join(" or ")}`,
      icon: AlertIcon,
      detail: "That part of the system didn't respond. Refresh in a minute.",
    });
  }
  return items;
}

// ---------------------------------------------------------------- the page
export default function DashboardPage({ onNavigate }) {
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await loadDashboard());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loading = !data;
  const months = data?.revenue ? lastTwelveMonths(data.revenue) : [];
  const totalOrders = data?.orders?.totalElements ?? null;
  const confirmedAll = data?.revenue?.reduce((s, m) => s + m.confirmedOrders, 0) ?? 0;
  const failedAll = data?.revenue?.reduce((s, m) => s + m.failedOrders, 0) ?? 0;

  return (
    <div className="mx-auto flex min-w-0 max-w-[1360px] flex-col gap-5 px-4 pb-12 pt-6 lg:px-8">
      {/* ---------------------------------------------------------- heading */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.015em] text-ink-900">
            {greeting()}, {session.user.username}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-slate-500" aria-live="polite">
              {refreshing
                ? "Refreshing…"
                : `Updated at ${data.loadedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          )}
          <button onClick={refresh} disabled={refreshing} className="btn-secondary h-8 px-3">
            <RefreshIcon width={14} height={14} aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Hold the previous numbers (dimmed) while refreshing, no skeleton flash */}
      <div
        className={"flex flex-col gap-5 transition-opacity duration-200 " + (refreshing && data ? "opacity-60" : "")}
        aria-busy={refreshing}
      >
        {/* ----------------------------------------- sales + needs attention */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <SalesSheet loading={loading} data={data} months={months} onNavigate={onNavigate} />
          <AttentionSheet loading={loading} items={data ? attentionItems(data, months) : []} onNavigate={onNavigate} />
        </div>

        {/* ------------------------------------------------------ ledger line */}
        <LedgerStrip loading={loading} finance={data?.finance} customers={data?.customers} onNavigate={onNavigate} />

        {/* ------------------------------------- latest orders + at a glance */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Sheet
            className="xl:col-span-2"
            title="Latest orders"
            action={{ label: "All orders", onClick: () => onNavigate("orders") }}
            flush
          >
            {loading ? (
              <div className="px-5 pb-5"><Skeleton className="h-[232px]" /></div>
            ) : !data.orders ? (
              <Unavailable what="orders" />
            ) : data.orders.content.length === 0 ? (
              <Empty
                text="No orders yet. They show up here as soon as one is placed."
                action={{ label: "Go to inventory", onClick: () => onNavigate("items") }}
              />
            ) : (
              <OrdersTable orders={data.orders.content} />
            )}
          </Sheet>

          <Sheet title="At a glance">
            <div className="space-y-6">
              <section aria-labelledby="stock-levels-title">
                <h4 id="stock-levels-title" className="mb-3 text-[13px] font-medium text-slate-600">Stock levels</h4>
                {loading ? (
                  <Skeleton className="h-[112px]" />
                ) : !data.stock ? (
                  <Unavailable what="stock levels" compact />
                ) : data.stock.totalItems === 0 ? (
                  <p className="text-sm text-slate-500">No items in the catalogue yet.</p>
                ) : (
                  <SplitBar
                    label="Stock levels across all items"
                    total={data.stock.totalItems}
                    parts={[
                      {
                        label: "In stock",
                        value: Math.max(0, data.stock.totalItems - data.stock.lowStock - data.stock.outOfStock),
                        color: "var(--color-ok)",
                        icon: CheckCircleIcon,
                        iconTone: "text-ok-ink",
                      },
                      { label: "Running low", value: data.stock.lowStock, color: "var(--color-warn)", icon: AlertIcon, iconTone: "text-warn-ink" },
                      { label: "Out of stock", value: data.stock.outOfStock, color: "var(--color-bad)", icon: XCircleIcon, iconTone: "text-bad-ink" },
                    ]}
                  />
                )}
              </section>

              <section aria-labelledby="order-outcomes-title" className="border-t border-[var(--rule-soft)] pt-5">
                <h4 id="order-outcomes-title" className="mb-3 text-[13px] font-medium text-slate-600">
                  How orders ended up
                </h4>
                {loading ? (
                  <Skeleton className="h-[112px]" />
                ) : totalOrders == null || !data.revenue ? (
                  <Unavailable what="order outcomes" compact />
                ) : totalOrders === 0 ? (
                  <p className="text-sm text-slate-500">No orders yet.</p>
                ) : (
                  <SplitBar
                    label="Outcome of every order placed"
                    // two services count these; never let the parts exceed the whole
                    total={Math.max(totalOrders, confirmedAll + failedAll)}
                    parts={[
                      { label: "Confirmed", value: confirmedAll, color: "var(--color-ok)", icon: CheckCircleIcon, iconTone: "text-ok-ink" },
                      {
                        label: "Pending or cancelled",
                        value: Math.max(0, totalOrders - confirmedAll - failedAll),
                        color: "var(--color-slate-300)",
                        icon: ClockIcon,
                        iconTone: "text-slate-500",
                      },
                      { label: "Failed", value: failedAll, color: "var(--color-bad)", icon: XCircleIcon, iconTone: "text-bad-ink" },
                    ]}
                  />
                )}
              </section>
            </div>
          </Sheet>
        </div>

        {/* --------------------------------------------------- stock movements */}
        <Sheet title="Stock movements" action={{ label: "Full history", onClick: () => onNavigate("reports") }} flush>
          {loading ? (
            <div className="px-5 pb-5"><Skeleton className="h-[200px]" /></div>
          ) : !data.events ? (
            <Unavailable what="stock movements" />
          ) : (data.events.content ?? []).length === 0 ? (
            <Empty text="No stock has moved yet. Receiving a purchase order or confirming a sale adds a line here." />
          ) : (
            <MovementsTable events={data.events.content.slice(0, 6)} />
          )}
        </Sheet>
      </div>
    </div>
  );
}

// ======================================================================
// Sections
// ======================================================================

function SalesSheet({ loading, data, months, onNavigate }) {
  const current = months.at(-1);
  const previous = months.at(-2);
  const delta = current && previous?.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : null;
  const allTime = data?.revenue?.reduce((s, m) => s + Number(m.confirmedRevenue), 0) ?? 0;

  return (
    <Sheet
      className="xl:col-span-2"
      title={current ? `Sales in ${monthName(current.date)}` : "Sales this month"}
      action={{ label: "Reports", onClick: () => onNavigate("reports") }}
    >
      {loading ? (
        <>
          <Skeleton className="h-12 w-56" />
          <Skeleton className="mt-6 h-[220px]" />
        </>
      ) : !data.revenue ? (
        <Unavailable what="sales" compact />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            {/* the hero figure: the one number this page leads with */}
            <div className="text-[48px] font-semibold leading-none tracking-[-0.03em] text-ink-900">
              {fmtMoney(current.revenue)}
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-2 pb-1 text-sm">
              <div>
                <dt className="text-slate-500">Compared with {monthName(previous.date)}</dt>
                <dd className="mt-0.5 font-medium">
                  {delta == null ? (
                    <span className="text-slate-500">No sales last month</span>
                  ) : (
                    <span className={"inline-flex items-center gap-1 " + (delta >= 0 ? "text-ok-ink" : "text-bad-ink")}>
                      {delta >= 0 ? (
                        <ArrowUpRightIcon width={14} height={14} aria-hidden="true" />
                      ) : (
                        <ArrowDownRightIcon width={14} height={14} aria-hidden="true" />
                      )}
                      {delta >= 0 ? "Up" : "Down"} {Math.abs(delta).toFixed(1)}%
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Orders confirmed</dt>
                <dd className="mt-0.5 font-medium text-ink-900">{count.format(current.confirmed)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">All-time sales</dt>
                <dd className="mt-0.5 font-medium text-ink-900">{fmtMoney(allTime)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-6">
            {allTime === 0 ? (
              <Empty text="No confirmed sales yet. The trend fills in as orders are confirmed." />
            ) : (
              <AreaChart
                data={months.map((m) => ({
                  label: monthName(m.date, "short"),
                  tooltipLabel: m.date.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }),
                  value: m.revenue,
                }))}
                height={248}
                formatValue={(v) => money.format(v)}
                formatTick={(v) => moneyCompact.format(v)}
                seriesName="confirmed sales"
                ariaLabel="Confirmed sales per month, last 12 months"
              />
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

const TONE = {
  bad: { icon: XCircleIcon, iconClass: "text-bad", edge: "bg-bad" },
  warn: { icon: AlertIcon, iconClass: "text-warn-ink", edge: "bg-warn" },
  info: { icon: DollarIcon, iconClass: "text-slate-500", edge: "bg-slate-300" },
};

/** The page's signature: a to-do list built from the data, not a chart. */
function AttentionSheet({ loading, items, onNavigate }) {
  const urgent = items.filter((i) => i.tone === "bad").length;
  return (
    <Sheet
      title="Needs attention"
      badge={urgent > 0 ? <span className="pill num bg-bad-wash text-bad-ink">{urgent}</span> : null}
      flush
    >
      {loading ? (
        <div className="space-y-3 px-5 pb-5">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex gap-3 px-5 pb-6 pt-1">
          <CheckCircleIcon width={20} height={20} className="mt-0.5 shrink-0 text-ok-ink" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-ink-900">You're all caught up</p>
            <p className="mt-0.5 text-sm text-slate-500">No failed orders this month, and every item is in stock.</p>
          </div>
        </div>
      ) : (
        <ul className="pb-2">
          {items.map((item) => {
            const tone = TONE[item.tone];
            const Icon = item.icon ?? tone.icon;
            const body = (
              <>
                <span className={"absolute inset-y-3 left-0 w-[3px] rounded-r-full " + tone.edge} aria-hidden="true" />
                <Icon width={18} height={18} className={"mt-0.5 shrink-0 " + tone.iconClass} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink-900">{item.title}</span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">{item.detail}</span>
                  {item.action && (
                    <span className="mt-1.5 block text-[13px] font-medium text-brand-600 group-hover:underline group-hover:underline-offset-4">
                      {item.action}
                    </span>
                  )}
                </span>
                {item.page && (
                  <ChevronRightIcon
                    width={16}
                    height={16}
                    className="mt-0.5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
                    aria-hidden="true"
                  />
                )}
              </>
            );
            return (
              <li key={item.title} className="border-t border-[var(--rule-soft)] first:border-t-0">
                {item.page ? (
                  <button
                    onClick={() => onNavigate(item.page)}
                    className="group relative flex w-full gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="relative flex gap-3 px-5 py-3.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

/** Money and counts on one ruled line, like the totals row of a ledger. */
function LedgerStrip({ loading, finance, customers, onNavigate }) {
  const figures = [
    { label: "Revenue booked", value: finance && fmtMoney(Number(finance.revenue)), page: "finance" },
    { label: "Owed to you", hint: "by customers", value: finance && fmtMoney(Number(finance.accountsReceivable)), page: "finance" },
    { label: "You owe", hint: "to suppliers", value: finance && fmtMoney(Number(finance.accountsPayable)), page: "finance" },
    { label: "Stock value", hint: "at cost", value: finance && fmtMoney(Number(finance.inventoryValue)), page: "items" },
    { label: "Customers", value: customers != null ? count.format(customers) : null, page: "customers" },
  ];

  return (
    <section className="card min-w-0 overflow-hidden" aria-label="Ledger totals">
      {/* -mb-px/-mr-px push the outer cell borders under the sheet's edge */}
      <ul className="-mb-px -mr-px grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {figures.map((f) => (
          <li key={f.label} className="border-b border-r border-[var(--rule-soft)]">
            <button
              onClick={() => onNavigate(f.page)}
              className="block h-full w-full px-5 py-4 text-left transition-colors hover:bg-slate-50"
            >
              <span className="block text-[13px] text-slate-500">
                {f.label}
                {f.hint && <span className="text-slate-400"> {f.hint}</span>}
              </span>
              <span className="mt-1 block text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">
                {loading ? (
                  <span className="mt-1 block h-6 w-20 animate-pulse rounded-[var(--radius-control)] bg-slate-100" aria-hidden="true" />
                ) : f.value ?? (
                  <span className="text-sm font-normal tracking-normal text-slate-400">Not available</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrdersTable({ orders }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">The six most recent sales orders</caption>
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th scope="col" className="px-5 pb-2 font-medium">Order</th>
            <th scope="col" className="hidden px-5 pb-2 font-medium sm:table-cell">Placed</th>
            <th scope="col" className="px-5 pb-2 text-right font-medium">Amount</th>
            <th scope="col" className="px-5 pb-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const s = ORDER_STATUS[o.status] ?? ORDER_STATUS.PENDING;
            const Icon = s.icon;
            return (
              <tr key={o.id} className="table-row">
                <td className="num px-5 py-3 font-medium text-ink-900">#{o.id.slice(0, 8)}</td>
                <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">
                  <time dateTime={o.createdAt} title={new Date(o.createdAt).toLocaleString()}>
                    {timeAgo(o.createdAt)}
                  </time>
                </td>
                <td className="num px-5 py-3 text-right text-ink-900">
                  {o.totalAmount != null ? money.format(Number(o.totalAmount)) : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={"pill " + s.pill}>
                    <Icon width={12} height={12} aria-hidden="true" />
                    {s.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTable({ events }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">The six most recent stock movements</caption>
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th scope="col" className="px-5 pb-2 font-medium">What happened</th>
            <th scope="col" className="hidden px-5 pb-2 font-medium sm:table-cell">Item</th>
            <th scope="col" className="hidden px-5 pb-2 font-medium md:table-cell">For</th>
            <th scope="col" className="px-5 pb-2 text-right font-medium">Units</th>
            <th scope="col" className="px-5 pb-2 text-right font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => {
            const m = movementOf(ev.eventType);
            return (
              <tr key={ev.id} className="table-row">
                <td className={"px-5 py-3 font-medium " + m.tone}>{m.label}</td>
                <td className="num hidden px-5 py-3 text-slate-600 sm:table-cell">#{ev.itemId?.slice(0, 8) ?? "—"}</td>
                <td className="num hidden px-5 py-3 text-slate-500 md:table-cell">
                  {ev.referenceId ? `#${String(ev.referenceId).slice(0, 8)}` : "—"}
                </td>
                <td className="num px-5 py-3 text-right font-medium text-ink-900">
                  {m.sign}
                  {count.format(Number(ev.quantity))}
                </td>
                <td className="px-5 py-3 text-right text-slate-500">
                  <time dateTime={ev.occurredAt} title={new Date(ev.occurredAt).toLocaleString()}>
                    {timeAgo(ev.occurredAt)}
                  </time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ======================================================================
// Building blocks
// ======================================================================

function Sheet({ title, badge, action, children, className = "", flush = false }) {
  return (
    <section className={"card flex min-w-0 flex-col " + className}>
      <header className="flex min-h-[52px] items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="card-title">{title}</h3>
          {badge}
        </div>
        {action && (
          <button onClick={action.onClick} className="btn-link shrink-0">
            {action.label}
          </button>
        )}
      </header>
      <div className={"flex-1 " + (flush ? "" : "px-5 pb-5")}>{children}</div>
    </section>
  );
}

/**
 * Thin segmented bar (dataviz "Part-to-whole"): one whole split into parts,
 * no text on the bar - the rows underneath carry name, icon, figure and share.
 * 8px, fully rounded ends, 2px sheet-coloured gap between parts.
 */
function SplitBar({ parts, total, label }) {
  const shown = parts.filter((p) => p.value > 0);
  const summary = parts.map((p) => `${p.label} ${count.format(p.value)}`).join(", ");
  return (
    <div>
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${label}: ${summary}`}>
        {shown.map((p) => (
          <div
            key={p.label}
            className="h-full"
            style={{ flexGrow: p.value, flexBasis: 0, background: p.color }}
            title={`${p.label}: ${count.format(p.value)} (${((p.value / total) * 100).toFixed(0)}%)`}
          />
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {parts.map(({ label: name, value, icon: Icon, iconTone }) => (
          <li key={name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <Icon width={15} height={15} className={iconTone} aria-hidden="true" />
              {name}
            </span>
            <span className="num">
              <span className="font-medium text-ink-900">{count.format(value)}</span>
              <span className="ml-2 inline-block w-9 text-right text-xs text-slate-500">
                {total ? Math.round((value / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Skeleton({ className = "" }) {
  return <div className={"animate-pulse rounded-[var(--radius-control)] bg-slate-100 " + className} aria-hidden="true" />;
}

function Empty({ text, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <p className="max-w-sm text-sm text-slate-500">{text}</p>
      {action && (
        <button onClick={action.onClick} className="btn-secondary h-8 px-3">
          {action.label}
        </button>
      )}
    </div>
  );
}

function Unavailable({ what, compact = false }) {
  return (
    <p className={"flex items-start gap-2 text-sm text-warn-ink " + (compact ? "" : "px-5 py-8")}>
      <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        Couldn't load {what}. Use Refresh to try again.
      </span>
    </p>
  );
}
