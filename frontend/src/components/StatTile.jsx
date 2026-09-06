// Stat tile per the dataviz skill's figure contract: label (sentence case, no
// trailing colon) + value (proportional figures, auto-compact) + optional
// sub-caption. `accent` renders the hero treatment for the handful of metrics
// that lead the dashboard; everything else stays a plain surface card.
export default function StatTile({ icon: Icon, label, value, caption, accent = false }) {
  return (
    <div
      className={
        "rounded-xl p-4 flex flex-col gap-2 transition-transform duration-150 hover:-translate-y-0.5 " +
        (accent
          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25"
          : "card")
      }
    >
      <div className="flex items-center justify-between">
        <span
          className={
            "text-[11px] font-semibold uppercase tracking-wide " +
            (accent ? "text-blue-100" : "text-slate-400")
          }
        >
          {label}
        </span>
        {Icon && (
          <div
            className={
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 " +
              (accent ? "bg-white/15" : "bg-slate-50")
            }
          >
            <Icon className={accent ? "text-white" : "text-slate-400"} width={15} height={15} />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold" style={{ fontVariantNumeric: "proportional-nums" }}>
        {value}
      </div>
      {caption && (
        <div className={"text-xs " + (accent ? "text-blue-100" : "text-slate-400")}>{caption}</div>
      )}
    </div>
  );
}
