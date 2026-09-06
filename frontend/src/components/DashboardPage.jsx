import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import StatTile from "./StatTile.jsx";
import BarChart from "./charts/BarChart.jsx";
import { CartIcon, UsersIcon, BoxIcon, AlertIcon } from "./icons.jsx";

const STATUS_COLOR = {
  CONFIRMED: "var(--chart-status-good)",
  FAILED: "var(--chart-status-critical)",
  PENDING: "var(--chart-status-warning)",
  CANCELLED: "var(--chart-status-warning)",
};

function formatMonthLabel(yearMonth) {
  const [y, m] = yearMonth.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export default function DashboardPage({ notify }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [revenueUnavailable, setRevenueUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [itemsPage, ordersPage, customersPage] = await Promise.all([
          api.listItems(),
          api.listOrders(),
          api.listCustomers(),
        ]);
        const items = itemsPage.content ?? [];
        const orders = ordersPage.content ?? [];
        const customers = customersPage.content ?? [];

        const stockResults = await Promise.all(items.map((item) => api.getStock(item.id).catch(() => null)));
        const outOfStock = stockResults.filter((s) => s && Number(s.quantityAvailable) <= 0).length;

        const confirmed = orders.filter((o) => o.status === "CONFIRMED");
        const failed = orders.filter((o) => o.status === "FAILED");
        const pending = orders.filter((o) => o.status === "PENDING");
        const cancelled_ = orders.filter((o) => o.status === "CANCELLED");

        const statusData = [
          { label: "Confirmed", value: confirmed.length, color: STATUS_COLOR.CONFIRMED },
          { label: "Failed", value: failed.length, color: STATUS_COLOR.FAILED },
          { label: "Pending", value: pending.length, color: STATUS_COLOR.PENDING },
          { label: "Cancelled", value: cancelled_.length, color: STATUS_COLOR.CANCELLED },
        ];

        // Sourced from reporting-service's CQRS projection (built off Kafka
        // events), not summed from the order list - see api.js. Handled as a
        // separate try/catch so a reporting-service outage degrades the
        // revenue chart, not the whole dashboard.
        let monthly = [];
        let totalRevenue = 0;
        let revenueFailed = false;
        try {
          const summary = await api.getRevenueSummary();
          monthly = summary.slice(-6).map((s) => ({ label: formatMonthLabel(s.yearMonth), value: Number(s.confirmedRevenue) }));
          totalRevenue = summary.reduce((sum, s) => sum + Number(s.confirmedRevenue), 0);
        } catch {
          revenueFailed = true;
        }

        if (!cancelled) {
          setStats({
            totalItems: items.length,
            totalOrders: orders.length,
            totalCustomers: customers.length,
            totalRevenue,
            failedCount: failed.length,
            outOfStock,
            monthly,
            statusData,
          });
          setRevenueUnavailable(revenueFailed);
        }
      } catch (err) {
        if (!cancelled) notify("error", err instanceof ApiError ? err.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  if (loading) {
    return <div className="px-6 py-10 text-center text-sm text-slate-400">Loading dashboard…</div>;
  }
  if (!stats) return null;

  const hasRevenueData = stats.monthly.length > 0;
  const hasOrders = stats.totalOrders > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile accent icon={CartIcon} label="Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} caption="Confirmed orders, all-time" />
        <StatTile accent icon={CartIcon} label="Total orders" value={stats.totalOrders} />
        <StatTile accent icon={UsersIcon} label="Customers" value={stats.totalCustomers} />
        <StatTile icon={BoxIcon} label="Items in catalog" value={stats.totalItems} />
        <StatTile icon={AlertIcon} label="Failed orders" value={stats.failedCount} />
        <StatTile icon={BoxIcon} label="Out of stock" value={stats.outOfStock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Monthly revenue</h2>
          <p className="text-xs text-slate-400 mb-4">Confirmed orders, by month placed — via reporting-service</p>
          {revenueUnavailable ? (
            <p className="text-sm text-amber-600 py-12 text-center">
              reporting-service is unavailable — revenue chart temporarily can't load
            </p>
          ) : hasRevenueData ? (
            <BarChart
              data={stats.monthly}
              formatValue={(v) => `$${v.toLocaleString()}`}
              ariaLabel="Monthly revenue from confirmed orders"
            />
          ) : (
            <p className="text-sm text-slate-400 py-12 text-center">No confirmed orders yet</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Orders by status</h2>
          <p className="text-xs text-slate-400 mb-4">All orders placed, all-time</p>
          {hasOrders ? (
            <BarChart data={stats.statusData} ariaLabel="Order count by status" />
          ) : (
            <p className="text-sm text-slate-400 py-12 text-center">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
