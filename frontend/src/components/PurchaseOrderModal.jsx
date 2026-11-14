const STATUS_STYLE = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-brand-50 text-brand-700",
  RECEIVED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export function PoStatusPill({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default function PurchaseOrderModal({ po, onClose }) {
  if (!po) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Purchase order detail</h3>
          <button onClick={onClose} className="btn-secondary py-1">
            Close
          </button>
        </div>

        <dl className="text-sm grid grid-cols-2 gap-y-1.5 mb-4">
          <dt className="text-slate-400">PO ID</dt>
          <dd className="font-mono text-xs">{po.id}</dd>
          <dt className="text-slate-400">Vendor</dt>
          <dd className="font-mono text-xs">{po.vendorId.slice(0, 8)}…</dd>
          <dt className="text-slate-400">Status</dt>
          <dd>
            <PoStatusPill status={po.status} />
          </dd>
          <dt className="text-slate-400">Total</dt>
          <dd>${Number(po.totalAmount).toFixed(2)}</dd>
          <dt className="text-slate-400">Created</dt>
          <dd>{new Date(po.createdAt).toLocaleString()}</dd>
          {po.receivedAt && (
            <>
              <dt className="text-slate-400">Received</dt>
              <dd>{new Date(po.receivedAt).toLocaleString()}</dd>
            </>
          )}
          {po.failureReason && (
            <>
              <dt className="text-slate-400">Failure reason</dt>
              <dd className="text-red-600 text-xs break-words">{po.failureReason}</dd>
            </>
          )}
        </dl>

        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Lines</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-1 pr-2">Item</th>
              <th className="py-1 pr-2">Qty</th>
              <th className="py-1 pr-2">Unit cost</th>
              <th className="py-1 pr-2">Line total</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((line, i) => (
              <tr key={i} className="table-row">
                <td className="py-1.5 pr-2 font-mono text-xs">{line.itemId.slice(0, 8)}…</td>
                <td className="py-1.5 pr-2">{Number(line.quantity)}</td>
                <td className="py-1.5 pr-2">${Number(line.unitCost).toFixed(2)}</td>
                <td className="py-1.5 pr-2">${Number(line.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
