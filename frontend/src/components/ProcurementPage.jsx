import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import PurchaseOrderModal, { PoStatusPill } from "./PurchaseOrderModal.jsx";

export default function ProcurementPage({ notify }) {
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPo, setSelectedPo] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorPage, itemPage, poPage] = await Promise.all([
        api.listVendors(),
        api.listItems(),
        api.listPurchaseOrders(),
      ]);
      setVendors(vendorPage.content ?? []);
      setItems(itemPage.content ?? []);
      setOrders(poPage.content ?? []);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load procurement data");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateVendor(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    try {
      await api.createVendor({ name, email: email || null, phone: null });
      notify("success", `Vendor ${name} created`);
      form.reset();
      load();
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to create vendor");
    }
  }

  async function handleCreatePo(e) {
    e.preventDefault();
    const form = e.target;
    const vendorId = form.vendorId.value;
    const itemId = form.itemId.value;
    const quantity = form.quantity.value;
    const unitCost = form.unitCost.value;
    if (!vendorId || !itemId) {
      notify("error", "Vendor and item are required");
      return;
    }
    try {
      const po = await api.createPurchaseOrder({
        vendorId,
        lines: [{ itemId, quantity: Number(quantity), unitCost: Number(unitCost) }],
      });
      notify("success", `Purchase order ${po.id.slice(0, 8)}… created as DRAFT`);
      form.reset();
      load();
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to create purchase order");
    }
  }

  async function handleSubmit(po) {
    setBusyId(po.id);
    try {
      await api.submitPurchaseOrder(po.id);
      notify("success", `PO ${po.id.slice(0, 8)}… submitted to vendor`);
      load();
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to submit purchase order");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReceive(po) {
    setBusyId(po.id);
    try {
      await api.receivePurchaseOrder(po.id);
      notify("success", `PO ${po.id.slice(0, 8)}… received — stock updated`);
      load();
    } catch (err) {
      notify(
        "error",
        err instanceof ApiError ? `${err.message}` : "Failed to receive purchase order"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function viewPo(id) {
    try {
      const po = await api.getPurchaseOrder(id);
      setSelectedPo(po);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load purchase order");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Create vendor</h2>
        <form onSubmit={handleCreateVendor} className="flex flex-wrap gap-2">
          <input name="name" placeholder="Vendor name" required className="input flex-1 min-w-[160px]" />
          <input name="email" type="email" placeholder="Email (optional)" className="input flex-1 min-w-[160px]" />
          <button type="submit" className="btn-primary">
            Add vendor
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Create purchase order</h2>
        {vendors.length === 0 ? (
          <p className="text-sm text-slate-400">Add a vendor first.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">No items in the catalog yet - add one from Inventory first.</p>
        ) : (
          <form onSubmit={handleCreatePo} className="flex flex-wrap gap-2">
            <select name="vendorId" required className="input flex-1 min-w-[160px]">
              <option value="">Vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select name="itemId" required className="input flex-1 min-w-[160px]">
              <option value="">Item…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku} — {i.name}
                </option>
              ))}
            </select>
            <input name="quantity" type="number" min="1" defaultValue="10" required className="input w-24" placeholder="Qty" />
            <input
              name="unitCost"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0.00"
              required
              className="input w-28"
              placeholder="Unit cost"
            />
            <button type="submit" className="btn-primary">
              Create PO
            </button>
          </form>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Purchase orders</h2>
          <button onClick={load} className="btn-secondary">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No purchase orders yet — create one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-2">PO</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Total</th>
                <th className="py-2 pr-2">Created</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="table-row">
                  <td className="py-2 pr-2 font-mono text-xs">{po.id.slice(0, 8)}…</td>
                  <td className="py-2 pr-2">
                    <PoStatusPill status={po.status} />
                  </td>
                  <td className="py-2 pr-2">${Number(po.totalAmount).toFixed(2)}</td>
                  <td className="py-2 pr-2 text-xs text-slate-500">{new Date(po.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-1.5 justify-end">
                      {po.status === "DRAFT" && (
                        <button disabled={busyId === po.id} onClick={() => handleSubmit(po)} className="btn-secondary py-1">
                          Submit
                        </button>
                      )}
                      {po.status === "SUBMITTED" && (
                        <button disabled={busyId === po.id} onClick={() => handleReceive(po)} className="btn-secondary py-1">
                          Receive
                        </button>
                      )}
                      <button onClick={() => viewPo(po.id)} className="btn-secondary py-1">
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <PurchaseOrderModal po={selectedPo} onClose={() => setSelectedPo(null)} />
    </div>
  );
}
