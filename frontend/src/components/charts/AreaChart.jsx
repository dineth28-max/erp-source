import { useEffect, useId, useMemo, useRef, useState } from "react";

// Single-series trend chart (dataviz spec): 2px line, ~10% area wash, hairline
// gridlines on clean ticks, end dot with a 2px surface ring, a crosshair that
// snaps to the nearest point (mouse + keyboard), and a visually hidden table.

function niceStep(max, ticks = 4) {
  if (max <= 0) return 1;
  const raw = max / ticks;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

export default function AreaChart({
  data, // [{ label, value }]
  height = 260,
  formatValue = (v) => v.toLocaleString(),
  formatTick = formatValue,
  seriesName = "Value",
  color = "var(--chart-series-blue)",
  ariaLabel,
}) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState(null);
  const gradientId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const { points, ticks, maxY } = useMemo(() => {
    const max = Math.max(0, ...data.map((d) => d.value));
    const step = niceStep(max);
    const top = Math.max(step, Math.ceil(max / step) * step);
    const t = [];
    for (let v = 0; v <= top + step / 2; v += step) t.push(v);
    const n = data.length;
    const pts = data.map((d, i) => ({
      ...d,
      x: pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
      y: pad.top + innerH - (d.value / top) * innerH,
    }));
    return { points: pts, ticks: t, maxY: top };
  }, [data, innerW, innerH, pad.left, pad.top]);

  if (!data.length) return null;

  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const base = pad.top + innerH;
  const area = `${line} L${points.at(-1).x},${base} L${points[0].x},${base} Z`;
  const last = points.at(-1);
  const hover = active != null ? points[active] : null;

  function nearestIndex(clientX) {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[best].x - x)) best = i;
    });
    return best;
  }

  function onKeyDown(e) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      setActive((i) => Math.min(points.length - 1, Math.max(0, (i ?? points.length - 1) + dir)));
    } else if (e.key === "Escape") {
      setActive(null);
    }
  }

  // tooltip stays inside the plot horizontally
  const tipLeft = hover ? Math.min(Math.max(hover.x, pad.left + 70), width - 70) : 0;

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((i) => i ?? points.length - 1)}
        onBlur={() => setActive(null)}
        onPointerMove={(e) => setActive(nearestIndex(e.clientX))}
        onPointerLeave={() => setActive(null)}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 rounded-lg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.14" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = pad.top + innerH - (t / maxY) * innerH;
          return (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke={t === 0 ? "var(--chart-baseline)" : "var(--chart-gridline)"}
                strokeWidth="1"
              />
              <text
                x={pad.left - 10}
                y={y}
                dy="0.32em"
                textAnchor="end"
                fontSize="11"
                fill="var(--chart-text-muted)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatTick(t)}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => (
          <text
            key={p.label}
            x={p.x}
            y={height - 8}
            textAnchor={i === 0 && points.length > 1 ? "start" : i === points.length - 1 && points.length > 1 ? "end" : "middle"}
            fontSize="11"
            fill={active === i ? "var(--chart-text-primary)" : "var(--chart-text-muted)"}
          >
            {p.label}
          </text>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hover && (
          <line x1={hover.x} x2={hover.x} y1={pad.top} y2={base} stroke="var(--chart-baseline)" strokeWidth="1" />
        )}

        {(hover ? [hover] : [last]).map((p) => (
          <circle key="dot" cx={p.x} cy={p.y} r="4.5" fill={color} stroke="var(--chart-surface)" strokeWidth="2" />
        ))}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg shadow-slate-900/10"
          style={{ left: tipLeft, top: Math.max(0, hover.y - 64) }}
          role="status"
        >
          <div className="text-[11px] text-slate-500">{hover.label}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: color }} aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-900">{formatValue(hover.value)}</span>
            <span className="text-xs text-slate-500">{seriesName}</span>
          </div>
        </div>
      )}

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">{seriesName}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
