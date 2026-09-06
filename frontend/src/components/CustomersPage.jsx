import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api.js";

export default function CustomersPage({ notify, searchTerm = "" }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await api.listCustomers();
      setCustomers(page.content ?? []);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    try {
      await api.createCustomer({ name, email: email || null, phone: phone || null });
      notify("success", `Customer ${name} created`);
      form.reset();
      load();
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to create customer");
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(term) || (c.email ?? "").toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">
      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Create customer</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input name="name" placeholder="Name" required className="input flex-1 min-w-[140px]" />
          <input name="email" type="email" placeholder="Email (optional)" className="input flex-1 min-w-[160px]" />
          <input name="phone" placeholder="Phone (optional)" className="input w-40" />
          <button type="submit" className="btn-primary">
            Add customer
          </button>
        </form>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            Customers {searchTerm && <span className="text-slate-400 font-normal">— filtered</span>}
          </h2>
          <button onClick={load} className="btn-secondary">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            {customers.length === 0 ? "No customers yet — create one above." : "No customers match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2 pr-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="table-row">
                  <td className="py-2 pr-2">{c.name}</td>
                  <td className="py-2 pr-2 text-slate-500">{c.email || "—"}</td>
                  <td className="py-2 pr-2 text-slate-500">{c.phone || "—"}</td>
                  <td className="py-2 pr-2 font-mono text-xs text-slate-400">{c.id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
