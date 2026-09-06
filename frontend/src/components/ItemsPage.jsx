import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api.js";

const DEMO_CUSTOMER_ID = "30000000-0000-0000-0000-000000000001";

export default function ItemsPage({ notify, onOrderPlaced, searchTerm = "" }) {
  const [rows, setRows] = useState([]); // [{ item, stock, price }]
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState(DEMO_CUSTOMER_ID);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await api.listItems();
      const items = page.content ?? [];
      const withDetails = await Promise.all(
        items.map(async (item) => {
          const [stock, price] = await Promise.all([
            api.getStock(item.id).catch(() => null),
            // A freshly created item may have no price set yet (a separate
            // call from create-item, in master-data-service) - that's a
            // valid state, not an error.
            api.getPrice(item.id).catch(() => null),
          ]);
          return { item, stock, price };
        })
      );
      setRows(withDetails);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateItem(e) {
    e.preventDefault();
    const form = e.target;
    const sku = form.sku.value.trim();
    const name = form.name.value.trim();
    const unitPrice = form.unitPrice.value;
    const description = form.description.value.trim();
    try {
      // Two calls behind one button: inventory-service owns the catalog
      // identity (sku/name), master-data-service owns the price. Keeping
      // them as separate services is the point of this phase - see README.
      const item = await api.createItem({ sku, name, description: description || null });
      await api.setPrice(item.id, Number(unitPrice));
      notify("success", `Item ${sku} created`);
      form.reset();
      load();
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to create item");
    }
  }

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      ({ item }) => item.sku.toLowerCase().includes(term) || item.name.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  async function handlePlaceOrder(item, quantity) {
    if (!customerId.trim()) {
      notify("error", "Customer ID is required");
      return;
    }
    try {
      // No unitPrice here - sales-service resolves the authoritative price
      // itself from master-data-service.
      const order = await api.createOrder({
        customerId: customerId.trim(),
        lines: [{ itemId: item.id, quantity: Number(quantity) }],
      });
      notify("success", `Order ${order.id.slice(0, 8)} placed (${order.status})`);
      load();
      onOrderPlaced?.();
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Order failed");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Create item</h2>
        <form onSubmit={handleCreateItem} className="flex flex-wrap gap-2">
          <input name="sku" placeholder="SKU" required className="input flex-1 min-w-[100px]" />
          <input name="name" placeholder="Name" required className="input flex-1 min-w-[140px]" />
          <input
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="Unit price"
            required
            className="input w-32"
          />
          <input name="description" placeholder="Description (optional)" className="input flex-1 min-w-[140px]" />
          <button type="submit" className="btn-primary">
            Add item
          </button>
        </form>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Items</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Ordering as customer</label>
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input w-64 font-mono text-xs"
            />
            <button onClick={load} className="btn-secondary">
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            {rows.length === 0 ? "No items yet — create one above." : "No items match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-2">SKU</th>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Price</th>
                <th className="py-2 pr-2">On hand</th>
                <th className="py-2 pr-2">Reserved</th>
                <th className="py-2 pr-2">Available</th>
                <th className="py-2 pr-2">Order</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ item, stock, price }) => (
                <ItemRow key={item.id} item={item} stock={stock} price={price} onOrder={handlePlaceOrder} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function ItemRow({ item, stock, price, onOrder }) {
  const [qty, setQty] = useState(1);
  const available = stock?.quantityAvailable ?? null;
  const hasPrice = price !== null;

  return (
    <tr className="table-row">
      <td className="py-2 pr-2 font-mono text-xs">{item.sku}</td>
      <td className="py-2 pr-2">{item.name}</td>
      <td className="py-2 pr-2">
        {hasPrice ? `$${Number(price.unitPrice).toFixed(2)}` : <span className="text-amber-600">no price set</span>}
      </td>
      <td className="py-2 pr-2">{stock ? Number(stock.quantityOnHand) : "—"}</td>
      <td className="py-2 pr-2">{stock ? Number(stock.quantityReserved) : "—"}</td>
      <td className="py-2 pr-2 font-medium">{available !== null ? Number(available) : "—"}</td>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input w-16 py-1"
          />
          <button onClick={() => onOrder(item, qty)} disabled={!hasPrice} className="btn-secondary py-1">
            Order
          </button>
        </div>
      </td>
    </tr>
  );
}
