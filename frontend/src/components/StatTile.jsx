// Stat tile (dataviz figure contract): label in sentence case, value in
// proportional figures (tabular only belongs in columns), optional caption.
// `accent` tints the icon of the one tile a page leads with.
export default function StatTile({ icon: Icon, label, value, caption, accent = false }) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-slate-500">{label}</span>
        {Icon && (
          <Icon
            width={17}
            height={17}
            aria-hidden="true"
            className={"shrink-0 " + (accent ? "text-brand-600" : "text-slate-400")}
          />
        )}
      </div>
      <div className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">{value}</div>
      {caption && <div className="mt-1 text-xs text-slate-500">{caption}</div>}
    </div>
  );
}
