import { useState } from "react";

// Rounds a max value up to a "clean" tick ceiling (1/2/5 x 10^n), so
// gridlines land on round numbers instead of the raw data max.
function niceCeil(value) {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const fraction = value / base;
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * base;
}

function roundedTopBarPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h);
  if (h <= 0) return "";
  return `M${x},${y + h} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} Z`;
}

/**
 * A single-series (or per-bar-colored, status-style) bar chart, hand-built in
 * SVG per the dataviz skill: <=24px bars, 4px rounded top / square baseline,
 * hairline gridlines on clean tick values, per-bar hover tooltip with a
 * bigger-than-the-mark hit target. No charting library - this project keeps
 * dependencies minimal, and two chart types don't justify one.
 */
export default function BarChart({ data, height = 220, formatValue = (v) => v.toLocaleString(), ariaLabel }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const width = 600;
  const marginLeft = 48;
  const marginRight = 12;
  const marginTop = 16;
  const marginBottom = 28;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const niceMax = niceCeil(maxValue || 1);
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (niceMax / tickCount) * i);

  const band = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(24, band * 0.55);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Gridlines + y-axis ticks, recessive hairlines on clean numbers */}
        {ticks.map((t, i) => {
          const y = marginTop + plotHeight - (t / niceMax) * plotHeight;
          return (
            <g key={i}>
              <line
                x1={marginLeft}
                x2={width - marginRight}
                y1={y}
                y2={y}
                stroke="var(--chart-gridline)"
                strokeWidth="1"
              />
              <text
                x={marginLeft - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="10"
                fill="var(--chart-text-muted)"
              >
                {formatValue(t)}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={marginLeft}
          x2={width - marginRight}
          y1={marginTop + plotHeight}
          y2={marginTop + plotHeight}
          stroke="var(--chart-baseline)"
          strokeWidth="1"
        />

        {data.map((d, i) => {
          const barHeight = niceMax > 0 ? (d.value / niceMax) * plotHeight : 0;
          const bandX = marginLeft + i * band;
          const barX = bandX + (band - barWidth) / 2;
          const barY = marginTop + plotHeight - barHeight;
          const isHovered = hoverIndex === i;
          const color = d.color || "var(--chart-series-blue)";

          return (
            <g key={i}>
              <path
                d={roundedTopBarPath(barX, barY, barWidth, Math.max(barHeight, 1), 4)}
                fill={color}
                opacity={isHovered ? 0.85 : 1}
              />
              {/* Value label at the cap - dataset is small (months / status
                  buckets), so labeling every bar stays readable. */}
              <text
                x={barX + barWidth / 2}
                y={barY - 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--chart-text-primary)"
              >
                {formatValue(d.value)}
              </text>
              <text
                x={bandX + band / 2}
                y={marginTop + plotHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill="var(--chart-text-secondary)"
              >
                {d.label}
              </text>
              {/* Hit target bigger than the mark - the full band, not just the bar */}
              <rect
                x={bandX}
                y={marginTop}
                width={band}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(i)}
                onBlur={() => setHoverIndex(null)}
                tabIndex={0}
                aria-label={`${d.label}: ${formatValue(d.value)}`}
              />
            </g>
          );
        })}
      </svg>

      {hoverIndex !== null && (
        <div className="pointer-events-none absolute top-0 left-0 bg-slate-900 text-white text-xs rounded-md px-2.5 py-1.5 shadow-lg"
          style={{
            left: `${((marginLeft + hoverIndex * band + band / 2) / width) * 100}%`,
            top: 0,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-semibold">{formatValue(data[hoverIndex].value)}</div>
          <div className="text-slate-300">{data[hoverIndex].label}</div>
        </div>
      )}
    </div>
  );
}
