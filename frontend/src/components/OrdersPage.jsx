import { useCallback, useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import { api, ApiError } from "../lib/api.js";
import OrderModal, { StatusPill } from "./OrderModal.jsx";

const OrdersPage = forwardRef(function OrdersPage({ notify, searchTerm = "" }, ref) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await api.listOrders();
      setOrders(page.content ?? []);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useImperativeHandle(ref, () => ({ reload: load }), [load]);

  useEffect(() => {
    load();
  }, [load]);

  async function viewOrder(orderId) {
    try {
      const order = await api.getOrder(orderId);
      setSelectedOrder(order);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load order");
    }
  }

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((o) => o.id.toLowerCase().includes(term) || o.status.toLowerCase().includes(term));
  }, [orders, searchTerm]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Orders</h2>
          <button onClick={load} className="btn-secondary">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            {orders.length === 0 ? "No orders yet — place one from the Inventory tab." : "No orders match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-2">Order</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Total</th>
                <th className="py-2 pr-2">Created</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} className="table-row">
                  <td className="py-2 pr-2 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                  <td className="py-2 pr-2">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="py-2 pr-2">${Number(o.totalAmount).toFixed(2)}</td>
                  <td className="py-2 pr-2 text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-2">
                    <button onClick={() => viewOrder(o.id)} className="btn-secondary py-1">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
});

export default OrdersPage;
