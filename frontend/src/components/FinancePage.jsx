import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import StatTile from "./StatTile.jsx";
import { CartIcon, UsersIcon, BoxIcon } from "./icons.jsx";

export default function FinancePage({ notify }) {
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, ledgerPage] = await Promise.all([api.getFinanceSummary(), api.getLedger()]);
      setSummary(summaryData);
      setLedger(ledgerPage.content ?? []);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="px-6 py-10 text-center text-sm text-slate-400">Loading ledger…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile accent icon={CartIcon} label="Revenue" value={`$${Number(summary.revenue).toFixed(2)}`} caption="Credited to Revenue" />
        <StatTile icon={UsersIcon} label="Accounts receivable" value={`$${Number(summary.accountsReceivable).toFixed(2)}`} caption="Owed by customers" />
        <StatTile icon={BoxIcon} label="Inventory value" value={`$${Number(summary.inventoryValue).toFixed(2)}`} caption="At cost, received stock" />
        <StatTile icon={BoxIcon} label="Accounts payable" value={`$${Number(summary.accountsPayable).toFixed(2)}`} caption="Owed to vendors" />
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold">General ledger</h2>
          <button onClick={load} className="btn-secondary">
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Double-entry, posted automatically off Kafka events - a confirmed sale debits Accounts
          Receivable / credits Revenue; a received purchase order debits Inventory / credits
          Accounts Payable. Every pair below shares the same source event, so debits and credits
          always balance.
        </p>

        {ledger.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            No journal entries yet — confirm an order or receive a purchase order to post one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Account</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2 text-right">Debit</th>
                <th className="py-2 pr-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.id} className="table-row">
                  <td className="py-2 pr-2 text-xs text-slate-500">{e.entryDate}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{e.account.replaceAll("_", " ")}</td>
                  <td className="py-2 pr-2 text-slate-500">{e.description}</td>
                  <td className="py-2 pr-2 text-right">{Number(e.debit) > 0 ? `$${Number(e.debit).toFixed(2)}` : "—"}</td>
                  <td className="py-2 pr-2 text-right">{Number(e.credit) > 0 ? `$${Number(e.credit).toFixed(2)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
