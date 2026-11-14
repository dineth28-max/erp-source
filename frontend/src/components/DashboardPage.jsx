import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import AreaChart from "./charts/AreaChart.jsx";
import {
  RefreshIcon, ArrowUpRightIcon, ArrowDownRightIcon, CheckCircleIcon, ClockIcon, XCircleIcon, AlertIcon,
} from "./icons.jsx";

// ---------------------------------------------------------------- formatting
const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const moneyCompact = new Intl.NumberFormat(undefined, {
  style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
});
const count = new Intl.NumberFormat();
const fmtMoney = (v) => (Math.abs(v) >= 10000 ? moneyCompact.format(v) : money.format(v));

function monthLabel(yearMonth) {
  const [y, m] = yearMonth.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

function timeAgo(iso) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** % change this month vs last month; null when there is no basis to compare. */
function monthDelta(series, key) {
  if (series.length < 2) return null;
  const prev = Number(series.at(-2)[key]);
  const cur = Number(series.at(-1)[key]);
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

const STATUS = {
  CONFIRMED: { label: "Confirmed", color: "var(--chart-status-good)", icon: CheckCircleIcon, pill: "bg-emerald-50 text-emerald-700" },
  PENDING: { label: "Pending", color: "var(--chart-status-warning)", icon: ClockIcon, pill: "bg-amber-50 text-amber-700" },
  CANCELLED: { label: "Cancelled", color: "var(--chart-status-serious)", icon: XCircleIcon, pill: "bg-orange-50 text-orange-700" },
  FAILED: { label: "Failed", color: "var(--chart-status-critical)", icon: XCircleIcon, pill: "bg-red-50 text-red-700" },
};

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

  const months = data?.revenue?.slice(-12) ?? [];
  const totalRevenue = data?.revenue?.reduce((s, m) => s + Number(m.confirmedRevenue), 0) ?? null;
  const confirmedAll = data?.revenue?.reduce((s, m) => s + m.confirmedOrders, 0) ?? 0;
  const failedAll = data?.revenue?.reduce((s, m) => s + m.failedOrders, 0) ?? 0;
  const totalOrders = data?.orders?.totalElements ?? null;
  const thisMonth = months.at(-1);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 lg:px-8">
      {/* --------------------------------------------------------- heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
            {greeting()}, {session.user.username}
          </h2>
          <p className="mt-1 text-sm text-slate-500">Here's how sales, stock and cash are moving right now.</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-slate-400">
              Updated {data.loadedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={refresh} disabled={refreshing} className="btn-secondary">
            <RefreshIcon width={15} height={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Revenue"
          loading={!data}
          unavailable={data && totalRevenue == null}
          value={totalRevenue != null ? fmtMoney(totalRevenue) : null}
          unit="all-time"
          delta={monthDelta(months, "confirmedRevenue")}
          footer={thisMonth ? `${fmtMoney(Number(thisMonth.confirmedRevenue))} this month` : "No confirmed sales yet"}
          onDetails={() => onNavigate("finance")}
        />
        <KpiCard
          title="Sales orders"
          loading={!data}
          unavailable={data && totalOrders == null}
          value={totalOrders != null ? count.format(totalOrders) : null}
          unit="orders"
          delta={monthDelta(months, "confirmedOrders")}
          deltaLabel="confirmed vs last month"
          footer={thisMonth ? `${count.format(thisMonth.confirmedOrders)} confirmed this month` : "No orders yet"}
          onDetails={() => onNavigate("orders")}
        />
        <KpiCard
          title="Customers"
          loading={!data}
          unavailable={data && data.customers == null}
          value={data?.customers != null ? count.format(data.customers) : null}
          unit="accounts"
          footer="Customer records on file"
          onDetails={() => onNavigate("customers")}
        />
        <KpiCard
          title="Stock alerts"
          loading={!data}
          unavailable={data && !data.stock}
          value={data?.stock ? count.format(data.stock.outOfStock) : null}
          unit="out of stock"
          footer={
            data?.stock
              ? `${count.format(data.stock.lowStock)} running low · ${count.format(data.stock.totalItems)} items`
              : ""
          }
          alert={data?.stock?.outOfStock > 0}
          onDetails={() => onNavigate("items")}
        />
      </div>

      {/* ------------------------------------------- revenue + order status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Revenue trend"
          subtitle="Confirmed sales per month, last 12 months"
          onDetails={() => onNavigate("reports")}
        >
          {!data ? (
            <Skeleton className="h-[260px]" />
          ) : !data.revenue ? (
            <Unavailable what="Revenue" />
          ) : months.length === 0 ? (
            <Empty>No confirmed sales yet - revenue appears here once orders are confirmed.</Empty>
          ) : (
            <AreaChart
              data={months.map((m) => ({ label: monthLabel(m.yearMonth), value: Number(m.confirmedRevenue) }))}
              formatValue={(v) => money.format(v)}
              formatTick={(v) => moneyCompact.format(v)}
              seriesName="revenue"
              ariaLabel="Confirmed revenue per month"
            />
          )}
        </Card>

        <Card title="Order status" subtitle="All orders, all-time" onDetails={() => onNavigate("orders")}>
          {!data ? (
            <Skeleton className="h-[200px]" />
          ) : totalOrders == null || !data.revenue ? (
            <Unavailable what="Order status" />
          ) : totalOrders === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <MeterList
              total={totalOrders}
              rows={[
                { ...STATUS.CONFIRMED, value: confirmedAll },
                { ...STATUS.PENDING, label: "Pending or cancelled", value: Math.max(0, totalOrders - confirmedAll - failedAll) },
                { ...STATUS.FAILED, value: failedAll },
              ]}
            />
          )}
        </Card>
      </div>

      {/* -------------------------------------- recent orders + activity */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Recent orders" subtitle="Newest first" onDetails={() => onNavigate("orders")} flush>
          {!data ? (
            <div className="p-5"><Skeleton className="h-[220px]" /></div>
          ) : !data.orders ? (
            <div className="p-5"><Unavailable what="Orders" /></div>
          ) : data.orders.content.length === 0 ? (
            <div className="p-5"><Empty>No orders yet.</Empty></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5 font-medium">Order</th>
                  <th className="px-5 py-2.5 font-medium">Placed</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.content.map((o) => {
                  const s = STATUS[o.status] ?? STATUS.PENDING;
                  const Icon = s.icon;
                  return (
                    <tr key={o.id} className="table-row">
                      <td className="px-5 py-3 font-mono text-[13px] text-slate-700">#{o.id.slice(0, 8)}</td>
                      <td className="px-5 py-3 text-slate-500">{timeAgo(o.createdAt)}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {o.totalAmount != null ? money.format(Number(o.totalAmount)) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={"pill " + s.pill}>
                          <Icon width={12} height={12} />
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Inventory activity" subtitle="Latest stock movements" onDetails={() => onNavigate("reports")}>
          {!data ? (
            <Skeleton className="h-[220px]" />
          ) : !data.events ? (
            <Unavailable what="Inventory activity" />
          ) : (data.events.content ?? []).length === 0 ? (
            <Empty>No stock movements yet.</Empty>
          ) : (
            <ul className="-my-1 divide-y divide-slate-100">
              {data.events.content.slice(0, 6).map((ev) => (
                <li key={ev.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{humanize(ev.eventType)}</div>
                    <div className="truncate text-xs text-slate-400">
                      Item <span className="font-mono">{ev.itemId?.slice(0, 8)}</span>
                      {ev.referenceId ? ` · ref ${String(ev.referenceId).slice(0, 8)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-slate-800" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {count.format(Number(ev.quantity))}
                    </div>
                    <div className="text-[11px] text-slate-400">{timeAgo(ev.occurredAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* --------------------------------------- stock health + finance */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Stock health" subtitle="Default warehouse, low = 10 units or fewer" onDetails={() => onNavigate("items")}>
          {!data ? (
            <Skeleton className="h-[150px]" />
          ) : !data.stock ? (
            <Unavailable what="Stock health" />
          ) : data.stock.totalItems === 0 ? (
            <Empty>No items in the catalog yet.</Empty>
          ) : (
            <MeterList
              total={data.stock.totalItems}
              rows={[
                {
                  label: "Healthy",
                  icon: CheckCircleIcon,
                  color: "var(--chart-status-good)",
                  value: Math.max(0, data.stock.totalItems - data.stock.lowStock - data.stock.outOfStock),
                },
                { label: "Running low", icon: AlertIcon, color: "var(--chart-status-warning)", value: data.stock.lowStock },
                { label: "Out of stock", icon: XCircleIcon, color: "var(--chart-status-critical)", value: data.stock.outOfStock },
              ]}
            />
          )}
        </Card>

        <Card className="xl:col-span-2" title="Finance snapshot" subtitle="From the general ledger" onDetails={() => onNavigate("finance")}>
          {!data ? (
            <Skeleton className="h-[150px]" />
          ) : !data.finance ? (
            <Unavailable what="Finance" />
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Figure label="Revenue booked" value={fmtMoney(Number(data.finance.revenue))} />
              <Figure label="Receivable" value={fmtMoney(Number(data.finance.accountsReceivable))} hint="Owed by customers" />
              <Figure label="Payable" value={fmtMoney(Number(data.finance.accountsPayable))} hint="Owed to vendors" />
              <Figure label="Inventory value" value={fmtMoney(Number(data.finance.inventoryValue))} hint="At cost" />
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- components
function humanize(code = "") {
  return code.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function Card({ title, subtitle, onDetails, children, className = "", flush = false }) {
  return (
    <section className={"card flex flex-col " + className}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {onDetails && <DetailsLink onClick={onDetails} />}
      </header>
      <div className={flush ? "pb-2" : "px-5 pb-5"}>{children}</div>
    </section>
  );
}

function DetailsLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      Details
    </button>
  );
}

function KpiCard({ title, value, unit, delta, deltaLabel = "vs last month", footer, onDetails, loading, unavailable, alert }) {
  const up = delta != null && delta >= 0;
  return (
    <section className="card flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="card-title">{title}</h3>
        <DetailsLink onClick={onDetails} />
      </div>

      {loading ? (
        <Skeleton className="mt-4 h-9 w-2/3" />
      ) : unavailable ? (
        <p className="mt-4 text-sm text-slate-400">Temporarily unavailable</p>
      ) : (
        <div className="mt-3 flex items-baseline gap-2">
          <span className={"text-[32px] font-semibold leading-none tracking-tight " + (alert ? "text-[var(--chart-status-critical)]" : "text-ink-900")}>
            {value}
          </span>
          <span className="text-sm text-slate-500">{unit}</span>
        </div>
      )}

      <div className="mt-3 h-5 text-xs">
        {!loading && !unavailable && delta != null && (
          <span className={"inline-flex items-center gap-1 font-medium " + (up ? "text-[#006300]" : "text-[var(--chart-status-critical)]")}>
            {up ? <ArrowUpRightIcon width={13} height={13} /> : <ArrowDownRightIcon width={13} height={13} />}
            {up ? "+" : ""}
            {delta.toFixed(1)}%
            <span className="font-normal text-slate-400">{deltaLabel}</span>
          </span>
        )}
      </div>

      <div className="mt-auto border-t border-slate-100 pt-3 text-xs text-slate-400">{loading ? " " : footer}</div>
    </section>
  );
}

/** Meter list (dataviz): name + icon, bar against the whole, figure + share. */
function MeterList({ rows, total }) {
  return (
    <ul className="space-y-4">
      {rows.map(({ label, value, color, icon: Icon }) => {
        const share = total ? (value / total) * 100 : 0;
        return (
          <li key={label}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <Icon width={15} height={15} style={{ color }} />
                {label}
              </span>
              <span className="text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span className="font-semibold">{count.format(value)}</span>
                <span className="ml-1.5 text-xs text-slate-400">{share.toFixed(0)}%</span>
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
              role="meter"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={value}
            >
              <div className="h-full rounded-full" style={{ width: `${share}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Figure({ label, value, hint }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight text-ink-900">{value}</dd>
      {hint && <dd className="text-[11px] text-slate-400">{hint}</dd>}
    </div>
  );
}

function Skeleton({ className = "" }) {
  return <div className={"animate-pulse rounded-lg bg-slate-100 " + className} aria-hidden="true" />;
}

function Empty({ children }) {
  return <p className="py-10 text-center text-sm text-slate-400">{children}</p>;
}

function Unavailable({ what }) {
  return (
    <p className="flex items-center justify-center gap-2 py-10 text-sm text-amber-700">
      <AlertIcon width={16} height={16} />
      {what} is temporarily unavailable
    </p>
  );
}
