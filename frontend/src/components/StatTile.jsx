// Stat tile (dataviz figure contract): label (sentence case) + value
// (proportional figures) + optional caption. Matches the dashboard KPI cards;
// `accent` gives the one tile a page leads with a brand-tinted icon.
export default function StatTile({ icon: Icon, label, value, caption, accent = false }) {
  return (
    <div className="card flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <span className="card-title">{label}</span>
        {Icon && (
          <div
            className={
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
              (accent ? "bg-brand-50 text-brand-600" : "bg-slate-50 text-slate-400")
            }
          >
            <Icon width={16} height={16} />
          </div>
        )}
      </div>
      <div className="text-[28px] font-semibold leading-tight tracking-tight text-ink-900">{value}</div>
      {caption && <div className="text-xs text-slate-400">{caption}</div>}
    </div>
  );
}
