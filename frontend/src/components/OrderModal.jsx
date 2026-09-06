export default function OrderModal({ order, onClose }) {
  if (!order) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Order detail</h3>
          <button onClick={onClose} className="btn-secondary py-1">
            Close
          </button>
        </div>

        <dl className="text-sm grid grid-cols-2 gap-y-1.5 mb-4">
          <dt className="text-slate-400">Order ID</dt>
          <dd className="font-mono text-xs">{order.id}</dd>
          <dt className="text-slate-400">Status</dt>
          <dd>
            <StatusPill status={order.status} />
          </dd>
          <dt className="text-slate-400">Total</dt>
          <dd>${Number(order.totalAmount).toFixed(2)}</dd>
          <dt className="text-slate-400">Created</dt>
          <dd>{new Date(order.createdAt).toLocaleString()}</dd>
          {order.failureReason && (
            <>
              <dt className="text-slate-400">Failure reason</dt>
              <dd className="text-red-600 text-xs break-words">{order.failureReason}</dd>
            </>
          )}
        </dl>

        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Lines</h4>
        {order.lines.length === 0 ? (
          <p className="text-sm text-slate-400">No line detail (order failed before any lines were persisted).</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-1 pr-2">Item</th>
                <th className="py-1 pr-2">Qty</th>
                <th className="py-1 pr-2">Unit price</th>
                <th className="py-1 pr-2">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, i) => (
                <tr key={i} className="table-row">
                  <td className="py-1.5 pr-2 font-mono text-xs">{line.itemId.slice(0, 8)}…</td>
                  <td className="py-1.5 pr-2">{Number(line.quantity)}</td>
                  <td className="py-1.5 pr-2">${Number(line.unitPrice).toFixed(2)}</td>
                  <td className="py-1.5 pr-2">${Number(line.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const styles = {
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    FAILED: "bg-red-50 text-red-700",
    PENDING: "bg-amber-50 text-amber-700",
    CANCELLED: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
