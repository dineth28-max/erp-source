import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api.js";

const EVENT_STYLE = {
  StockReserved: "bg-emerald-50 text-emerald-700",
  StockReservationFailed: "bg-red-50 text-red-700",
  StockReleased: "bg-amber-50 text-amber-700",
  StockConfirmed: "bg-blue-50 text-blue-700",
};

function EventPill({ eventType }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${EVENT_STYLE[eventType] ?? "bg-slate-100 text-slate-600"}`}>
      {eventType}
    </span>
  );
}

export default function ReportsPage({ notify, searchTerm = "" }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await api.getInventoryEvents();
      setEvents(page.content ?? []);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load activity feed");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return events;
    return events.filter(
      (e) => e.eventType.toLowerCase().includes(term) || e.itemId.toLowerCase().includes(term)
    );
  }, [events, searchTerm]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <section className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold">Inventory activity</h2>
          <button onClick={load} className="btn-secondary">
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Every stock reservation/release/failure, consumed off Kafka by reporting-service — this
          is the same event stream sales-service's saga publishes, viewed from the read side.
        </p>

        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            {events.length === 0 ? "No activity yet — place an order to generate some." : "No events match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-2">Event</th>
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Quantity</th>
                <th className="py-2 pr-2">Reference</th>
                <th className="py-2 pr-2">Reason</th>
                <th className="py-2 pr-2">Occurred</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="table-row">
                  <td className="py-2 pr-2">
                    <EventPill eventType={e.eventType} />
                  </td>
                  <td className="py-2 pr-2 font-mono text-xs">{e.itemId.slice(0, 8)}…</td>
                  <td className="py-2 pr-2">{e.quantity !== null ? Number(e.quantity) : "—"}</td>
                  <td className="py-2 pr-2 font-mono text-xs text-slate-400">{e.referenceId ? `${e.referenceId.slice(0, 8)}…` : "—"}</td>
                  <td className="py-2 pr-2 text-slate-500">{e.reason || "—"}</td>
                  <td className="py-2 pr-2 text-xs text-slate-500">{new Date(e.occurredAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
