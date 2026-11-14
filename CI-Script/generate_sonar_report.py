#!/usr/bin/env python3
"""Read sonar_results.json and generate an HTML + PDF SonarQube quality report.

Usage:
  python generate_sonar_report.py \
      --input  sonar-results/sonar_results.json \
      --output-html reports/test_report.html \
      --output-pdf  reports/test_report.pdf
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path


# ── helpers ───────────────────────────────────────────────────────────────────

def esc(v: object) -> str:
    return html.escape(str(v))


def _v(measures: dict, key: str, default: str = "—") -> str:
    val = measures.get(key, "")
    return str(val) if val not in ("", None) else default


def rating_letter(raw: str) -> str:
    return {"1.0": "A", "2.0": "B", "3.0": "C", "4.0": "D", "5.0": "E"}.get(raw, raw or "—")


def rating_bg(raw: str) -> str:
    return {
        "1.0": "#16a34a", "2.0": "#65a30d",
        "3.0": "#d97706", "4.0": "#ea580c", "5.0": "#dc2626",
    }.get(raw, "#94a3b8")


def gate_ok(status: str) -> bool:
    return str(status).upper() in ("OK", "PASSED")


def fmt_num(val: str) -> str:
    try:
        n = int(val)
        if n >= 1_000_000:
            return f"{n / 1_000_000:.1f}M"
        if n >= 1_000:
            return f"{n / 1_000:.1f}k"
        return str(n)
    except (ValueError, TypeError):
        return val or "—"


def fmt_pct(val: str) -> str:
    try:
        return f"{float(val):.1f}%"
    except (ValueError, TypeError):
        return val or "—"


def fmt_debt(val: str) -> str:
    try:
        mins = int(val)
        if mins >= 60 * 24:
            return f"{mins // (60 * 24)}d {(mins % (60 * 24)) // 60}h"
        if mins >= 60:
            return f"{mins // 60}h {mins % 60}min"
        return f"{mins}min"
    except (ValueError, TypeError):
        return val or "—"


# ── condition row ─────────────────────────────────────────────────────────────

_METRIC_LABELS: dict[str, str] = {
    "new_reliability_rating":     "New Reliability Rating",
    "new_security_rating":        "New Security Rating",
    "new_maintainability_rating": "New Maintainability Rating",
    "new_coverage":               "New Coverage",
    "new_duplicated_lines_density": "New Duplications",
    "new_bugs":                   "New Bugs",
    "new_vulnerabilities":        "New Vulnerabilities",
    "new_code_smells":            "New Code Smells",
    "reliability_rating":         "Reliability Rating",
    "security_rating":            "Security Rating",
    "maintainability_rating":     "Maintainability Rating",
    "coverage":                   "Coverage",
    "duplicated_lines_density":   "Duplications",
    "bugs":                       "Bugs",
    "vulnerabilities":            "Vulnerabilities",
    "code_smells":                "Code Smells",
}


def _condition_rows(conditions: list[dict]) -> str:
    if not conditions:
        return '<tr><td colspan="4" style="text-align:center;padding:20px;color:#64748b">No quality gate conditions available.</td></tr>'
    rows = ""
    for c in conditions:
        ok_cond  = gate_ok(c.get("status", ""))
        metric   = c.get("metricKey", "")
        label    = _METRIC_LABELS.get(metric, metric)
        actual   = c.get("actualValue", "—")
        thresh   = c.get("errorThreshold", "—")
        comparator = c.get("comparator", "")
        comp_map = {"GT": ">", "LT": "<", "GTE": "≥", "LTE": "≤", "EQ": "=", "NE": "≠"}
        comp_sym = comp_map.get(comparator, comparator)
        badge_cls = "badge-ok" if ok_cond else "badge-fail"
        badge_txt = "OK" if ok_cond else "FAILED"
        rows += f"""
        <tr>
          <td>{esc(label)}</td>
          <td class="mono">{esc(actual)}</td>
          <td class="mono">{esc(comp_sym)} {esc(thresh)}</td>
          <td><span class="{badge_cls}">{badge_txt}</span></td>
        </tr>"""
    return rows


# ── main HTML renderer ────────────────────────────────────────────────────────

def render_html(data: dict) -> str:
    m            = data.get("measures", {})
    qg           = data.get("quality_gate", {})
    conditions   = qg.get("conditions", [])
    gate_status  = qg.get("status", "UNKNOWN")
    ok           = gate_ok(gate_status)
    project_name = data.get("project_name", data.get("project_key", ""))
    run_number   = data.get("run_number", "—")
    branch       = data.get("branch", "main")
    commit       = data.get("commit", "—")
    fetched_at   = data.get("fetched_at", "")[:19].replace("T", " ") + " UTC" if data.get("fetched_at") else "—"
    sonar_url    = data.get("sonar_url", "#")
    repository   = data.get("repository", "")

    bugs         = fmt_num(_v(m, "bugs",         "0"))
    vulns        = fmt_num(_v(m, "vulnerabilities", "0"))
    smells       = fmt_num(_v(m, "code_smells",  "0"))
    hotspots     = fmt_num(_v(m, "security_hotspots", "0"))
    coverage     = fmt_pct(_v(m, "coverage",     ""))
    duplication  = fmt_pct(_v(m, "duplicated_lines_density", ""))
    ncloc        = fmt_num(_v(m, "ncloc",        "0"))
    debt_raw     = _v(m, "sqale_index", "")
    tech_debt    = fmt_debt(debt_raw) if debt_raw not in ("—", "") else "—"
    debt_ratio   = fmt_pct(_v(m, "sqale_debt_ratio", ""))

    rel_raw  = _v(m, "reliability_rating",    "")
    sec_raw  = _v(m, "security_rating",       "")
    maint_raw= _v(m, "maintainability_rating","")
    rel_let  = rating_letter(rel_raw)
    sec_let  = rating_letter(sec_raw)
    maint_let= rating_letter(maint_raw)
    rel_bg   = rating_bg(rel_raw)
    sec_bg   = rating_bg(sec_raw)
    maint_bg = rating_bg(maint_raw)

    blocker  = fmt_num(_v(m, "blocker_violations",  "0"))
    critical = fmt_num(_v(m, "critical_violations", "0"))
    major    = fmt_num(_v(m, "major_violations",    "0"))
    minor    = fmt_num(_v(m, "minor_violations",    "0"))
    info_v   = fmt_num(_v(m, "info_violations",     "0"))

    cond_rows = _condition_rows(conditions)
    gate_label = "Quality Gate Passed" if ok else "Quality Gate Failed"
    gate_cls   = "ok" if ok else "fail"

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SonarQube Report · {esc(project_name)}</title>
  <style>
    *,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
    :root{{
      --g:#16a34a;--gb:#dcfce7;--r:#dc2626;--rb:#fee2e2;
      --a:#d97706;--ab:#fef3c7;--b:#2563eb;--bb:#dbeafe;
      --ink:#0f172a;--ink2:#334155;--ink3:#64748b;
      --surface:#fff;--page:#f8fafc;--bd:#e2e8f0;--rad:12px;
    }}
    body{{font-family:Arial,Helvetica,sans-serif;background:var(--page);color:var(--ink);font-size:14px;min-height:100vh}}

    /* ── header ── */
    .hdr{{background:var(--ink);padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px}}
    .hdr-left h1{{font-size:20px;font-weight:700;color:#fff}}
    .hdr-left .sub{{font-size:11px;color:#94a3b8;font-family:monospace;margin-top:4px}}
    .gate-badge{{display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:100px;font-size:13px;font-weight:700}}
    .gate-badge.ok{{background:#15803d;color:#fff}}
    .gate-badge.fail{{background:#b91c1c;color:#fff}}
    .dot{{width:8px;height:8px;border-radius:50%;flex-shrink:0}}
    .ok .dot{{background:#4ade80;animation:pulse 2s ease-in-out infinite}}
    @keyframes pulse{{0%,100%{{opacity:1}}50%{{opacity:.4}}}}
    .fail .dot{{background:#fca5a5}}
    .run-meta{{font-size:11px;color:#94a3b8;font-family:monospace;margin-top:5px;text-align:right}}

    /* ── layout ── */
    .main{{padding:28px 40px;max-width:1200px}}

    /* ── section head ── */
    .sh{{display:flex;align-items:center;gap:10px;margin-bottom:14px;margin-top:28px}}
    .sh h2{{font-size:15px;font-weight:700}}
    .pill{{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 9px;border-radius:100px}}
    .pill-b{{background:var(--bb);color:var(--b)}}
    .pill-g{{background:var(--gb);color:var(--g)}}
    .pill-r{{background:var(--rb);color:var(--r)}}

    /* ── metric cards grid ── */
    .cards{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}}
    .card{{background:var(--surface);border:1px solid var(--bd);border-radius:var(--rad);padding:16px 14px 14px;position:relative;overflow:hidden}}
    .card::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px}}
    .card.cbug::before{{background:#dc2626}}
    .card.cvuln::before{{background:#d97706}}
    .card.csmell::before{{background:#2563eb}}
    .card.cspot::before{{background:#7c3aed}}
    .card.ccov::before{{background:#0891b2}}
    .card.cdup::before{{background:#64748b}}
    .card.cloc::before{{background:#334155}}
    .card.cdebt::before{{background:#8b5cf6}}
    .clbl{{font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px}}
    .cval{{font-size:30px;font-weight:800;line-height:1;color:var(--ink)}}
    .cval.red{{color:#dc2626}}.cval.amber{{color:#d97706}}.cval.blue{{color:#2563eb}}
    .cval.purple{{color:#7c3aed}}.cval.teal{{color:#0891b2}}.cval.slate{{color:#475569}}
    .csub{{font-size:10px;color:var(--ink3);margin-top:5px}}

    /* ── ratings row ── */
    .ratings{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}}
    .rating-card{{background:var(--surface);border:1px solid var(--bd);border-radius:var(--rad);padding:16px;display:flex;align-items:center;gap:16px}}
    .rating-badge{{width:52px;height:52px;border-radius:var(--rad);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;flex-shrink:0}}
    .rating-info .ri-label{{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink3)}}
    .rating-info .ri-name{{font-size:14px;font-weight:700;color:var(--ink);margin-top:4px}}
    .rating-info .ri-sub{{font-size:11px;color:var(--ink3);margin-top:2px}}

    /* ── severity row ── */
    .sev-grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px}}
    .sev-card{{background:var(--surface);border:1px solid var(--bd);border-radius:var(--rad);padding:14px 12px;text-align:center}}
    .sev-dot{{width:10px;height:10px;border-radius:50%;display:inline-block;margin-bottom:8px}}
    .sev-val{{font-size:24px;font-weight:800;color:var(--ink)}}
    .sev-lbl{{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink3);margin-top:4px}}

    /* ── conditions table ── */
    .tbl-wrap{{background:var(--surface);border:1px solid var(--bd);border-radius:var(--rad);overflow:hidden;margin-bottom:24px}}
    table{{width:100%;border-collapse:collapse}}
    thead th{{background:var(--ink);color:#fff;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:11px 16px;text-align:left}}
    tbody tr{{border-bottom:1px solid var(--bd)}}
    tbody tr:last-child{{border-bottom:none}}
    tbody tr:hover{{background:#fafbfc}}
    tbody td{{padding:11px 16px;vertical-align:middle}}
    .badge-ok{{background:var(--gb);color:var(--g);font-size:10px;font-weight:700;padding:2px 9px;border-radius:5px;display:inline-block}}
    .badge-fail{{background:var(--rb);color:var(--r);font-size:10px;font-weight:700;padding:2px 9px;border-radius:5px;display:inline-block}}
    .mono{{font-family:monospace}}

    /* ── sonar link ── */
    .sonar-link{{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:#2563eb;text-decoration:none;font-weight:600}}
    .sonar-link:hover{{text-decoration:underline}}

    /* ── footer ── */
    .footer{{padding:18px 40px;border-top:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--ink3);font-family:monospace}}

    @media print{{
      body{{background:#fff}}
      .hdr,.rating-badge,.sev-dot{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      thead th{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    }}
  </style>
</head>
<body>

<!-- HEADER -->
<div class="hdr">
  <div class="hdr-left">
    <h1>SonarQube Code Quality Report</h1>
    <div class="sub">
      {esc(repository or project_name)} · Build #{esc(run_number)} · Branch: {esc(branch)} · Commit: {esc(commit)}
    </div>
  </div>
  <div>
    <div class="gate-badge {gate_cls}">
      <span class="dot"></span>{esc(gate_label)}
    </div>
    <div class="run-meta">{esc(fetched_at)}</div>
  </div>
</div>

<div class="main">

<!-- METRIC CARDS -->
<div class="sh"><h2>Code Quality Metrics</h2></div>
<div class="cards">
  <div class="card cbug">
    <div class="clbl">Bugs</div>
    <div class="cval red">{esc(bugs)}</div>
    <div class="csub">Reliability issues</div>
  </div>
  <div class="card cvuln">
    <div class="clbl">Vulnerabilities</div>
    <div class="cval amber">{esc(vulns)}</div>
    <div class="csub">Security issues</div>
  </div>
  <div class="card csmell">
    <div class="clbl">Code Smells</div>
    <div class="cval blue">{esc(smells)}</div>
    <div class="csub">Maintainability issues</div>
  </div>
  <div class="card cspot">
    <div class="clbl">Security Hotspots</div>
    <div class="cval purple">{esc(hotspots)}</div>
    <div class="csub">Needs review</div>
  </div>
  <div class="card ccov">
    <div class="clbl">Coverage</div>
    <div class="cval teal">{esc(coverage)}</div>
    <div class="csub">Line coverage</div>
  </div>
  <div class="card cdup">
    <div class="clbl">Duplications</div>
    <div class="cval slate">{esc(duplication)}</div>
    <div class="csub">Duplicated lines</div>
  </div>
  <div class="card cloc">
    <div class="clbl">Lines of Code</div>
    <div class="cval">{esc(ncloc)}</div>
    <div class="csub">Non-comment lines</div>
  </div>
  <div class="card cdebt">
    <div class="clbl">Technical Debt</div>
    <div class="cval purple">{esc(tech_debt)}</div>
    <div class="csub">Debt ratio: {esc(debt_ratio)}</div>
  </div>
</div>

<!-- RATINGS -->
<div class="sh"><h2>Quality Ratings</h2></div>
<div class="ratings">
  <div class="rating-card">
    <div class="rating-badge" style="background:{esc(rel_bg)}">{esc(rel_let)}</div>
    <div class="rating-info">
      <div class="ri-label">Rating</div>
      <div class="ri-name">Reliability</div>
      <div class="ri-sub">{esc(bugs)} bug(s) detected</div>
    </div>
  </div>
  <div class="rating-card">
    <div class="rating-badge" style="background:{esc(sec_bg)}">{esc(sec_let)}</div>
    <div class="rating-info">
      <div class="ri-label">Rating</div>
      <div class="ri-name">Security</div>
      <div class="ri-sub">{esc(vulns)} vulnerability(s)</div>
    </div>
  </div>
  <div class="rating-card">
    <div class="rating-badge" style="background:{esc(maint_bg)}">{esc(maint_let)}</div>
    <div class="rating-info">
      <div class="ri-label">Rating</div>
      <div class="ri-name">Maintainability</div>
      <div class="ri-sub">Tech debt: {esc(tech_debt)}</div>
    </div>
  </div>
</div>

<!-- SEVERITY BREAKDOWN -->
<div class="sh"><h2>Issues by Severity</h2></div>
<div class="sev-grid">
  <div class="sev-card">
    <div class="sev-dot" style="background:#7c3aed"></div>
    <div class="sev-val">{esc(blocker)}</div>
    <div class="sev-lbl">Blocker</div>
  </div>
  <div class="sev-card">
    <div class="sev-dot" style="background:#dc2626"></div>
    <div class="sev-val">{esc(critical)}</div>
    <div class="sev-lbl">Critical</div>
  </div>
  <div class="sev-card">
    <div class="sev-dot" style="background:#d97706"></div>
    <div class="sev-val">{esc(major)}</div>
    <div class="sev-lbl">Major</div>
  </div>
  <div class="sev-card">
    <div class="sev-dot" style="background:#2563eb"></div>
    <div class="sev-val">{esc(minor)}</div>
    <div class="sev-lbl">Minor</div>
  </div>
  <div class="sev-card">
    <div class="sev-dot" style="background:#64748b"></div>
    <div class="sev-val">{esc(info_v)}</div>
    <div class="sev-lbl">Info</div>
  </div>
</div>

<!-- QUALITY GATE CONDITIONS -->
<div class="sh">
  <h2>Quality Gate Conditions</h2>
  <span class="pill {'pill-g' if ok else 'pill-r'}">{esc(gate_status)}</span>
</div>
<div class="tbl-wrap">
  <table>
    <thead>
      <tr><th>Metric</th><th>Actual Value</th><th>Threshold</th><th>Status</th></tr>
    </thead>
    <tbody>{cond_rows}</tbody>
  </table>
</div>

<!-- SONARQUBE LINK -->
<div style="margin-bottom:28px">
  <a class="sonar-link" href="{esc(sonar_url)}" target="_blank">
    ↗ View full report in SonarQube
  </a>
</div>

</div><!-- /main -->

<div class="footer">
  <span>SonarQube Quality Report · {esc(project_name)} · Build #{esc(run_number)}</span>
  <span>{esc(fetched_at)}</span>
</div>

</body>
</html>"""


# ── PDF writer ────────────────────────────────────────────────────────────────

def write_pdf(html_content: str, output_pdf: Path) -> None:
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise RuntimeError("WeasyPrint is required to generate the PDF report.") from exc
    HTML(string=html_content, base_url=str(Path.cwd())).write_pdf(str(output_pdf))


# ── entry point ───────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate HTML + PDF from sonar_results.json.")
    parser.add_argument("--input",       default="sonar-results/sonar_results.json")
    parser.add_argument("--output-html", default="reports/test_report.html")
    parser.add_argument("--output-pdf",  default="reports/test_report.pdf")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path  = Path(args.input)
    output_html = Path(args.output_html)
    output_pdf  = Path(args.output_pdf)

    if not input_path.exists():
        print(f"WARNING: {input_path} not found — generating error report.", file=sys.stderr)
        data = {
            "project_key":  "unknown",
            "project_name": "Unknown Project",
            "fetched_at":   "",
            "run_number":   "",
            "branch":       "",
            "commit":       "",
            "repository":   "",
            "sonar_url":    "#",
            "quality_gate": {"status": "ERROR", "conditions": []},
            "measures":     {},
        }
    else:
        data = json.loads(input_path.read_text(encoding="utf-8"))

    output_html.parent.mkdir(parents=True, exist_ok=True)
    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    html_content = render_html(data)
    output_html.write_text(html_content, encoding="utf-8")
    print(f"Wrote HTML → {output_html}")

    try:
        write_pdf(html_content, output_pdf)
        print(f"Wrote PDF  → {output_pdf}")
    except Exception as exc:
        print(f"WARNING: PDF generation failed ({exc}) — HTML report is still available.", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
