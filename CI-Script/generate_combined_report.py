#!/usr/bin/env python3
"""Generate a single combined HTML + PDF report from SonarQube and Trivy results.

Usage:
  python generate_combined_report.py \
      --sonar-input  sonar-results/sonar_results.json \
      --trivy-input  trivy-results/trivy_results.json \
      --output-html  reports/combined_report.html \
      --output-pdf   reports/combined_report.pdf
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path

SEV_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
SEV_COLOR = {
    "CRITICAL": "#7c3aed",
    "HIGH":     "#dc2626",
    "MEDIUM":   "#d97706",
    "LOW":      "#2563eb",
    "UNKNOWN":  "#64748b",
}
SEV_BG = {
    "CRITICAL": "#f3e8ff",
    "HIGH":     "#fee2e2",
    "MEDIUM":   "#fef3c7",
    "LOW":      "#dbeafe",
    "UNKNOWN":  "#f1f5f9",
}


# ── generic helpers ───────────────────────────────────────────────────────────

def esc(v: object) -> str:
    return html.escape(str(v))


def _v(d: dict, key: str, default: str = "—") -> str:
    val = d.get(key, "")
    return str(val) if val not in ("", None) else default


def _load(path: Path) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


# ── SonarQube helpers ─────────────────────────────────────────────────────────

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


def rating_letter(raw: str) -> str:
    return {"1.0": "A", "2.0": "B", "3.0": "C", "4.0": "D", "5.0": "E"}.get(raw, raw or "—")


def rating_bg(raw: str) -> str:
    return {
        "1.0": "#16a34a", "2.0": "#65a30d",
        "3.0": "#d97706", "4.0": "#ea580c", "5.0": "#dc2626",
    }.get(raw, "#94a3b8")


def gate_ok(status: str) -> bool:
    return str(status).upper() in ("OK", "PASSED")


_METRIC_LABELS: dict[str, str] = {
    "new_reliability_rating":       "New Reliability Rating",
    "new_security_rating":          "New Security Rating",
    "new_maintainability_rating":   "New Maintainability Rating",
    "new_coverage":                 "New Coverage",
    "new_duplicated_lines_density": "New Duplications",
    "new_bugs":                     "New Bugs",
    "new_vulnerabilities":          "New Vulnerabilities",
    "new_code_smells":              "New Code Smells",
    "reliability_rating":           "Reliability Rating",
    "security_rating":              "Security Rating",
    "maintainability_rating":       "Maintainability Rating",
    "coverage":                     "Coverage",
    "duplicated_lines_density":     "Duplications",
    "bugs":                         "Bugs",
    "vulnerabilities":              "Vulnerabilities",
    "code_smells":                  "Code Smells",
}


def _condition_rows(conditions: list[dict]) -> str:
    if not conditions:
        return '<tr><td colspan="4" class="empty-cell">No quality gate conditions available.</td></tr>'
    rows = ""
    comp_map = {"GT": ">", "LT": "<", "GTE": "≥", "LTE": "≤", "EQ": "=", "NE": "≠"}
    for c in conditions:
        ok_cond    = gate_ok(c.get("status", ""))
        metric     = c.get("metricKey", "")
        label      = _METRIC_LABELS.get(metric, metric)
        actual     = c.get("actualValue", "—")
        thresh     = c.get("errorThreshold", "—")
        comp_sym   = comp_map.get(c.get("comparator", ""), c.get("comparator", ""))
        badge_cls  = "badge-ok" if ok_cond else "badge-fail"
        badge_txt  = "OK" if ok_cond else "FAILED"
        rows += f"""
        <tr>
          <td>{esc(label)}</td>
          <td class="mono">{esc(actual)}</td>
          <td class="mono">{esc(comp_sym)} {esc(thresh)}</td>
          <td><span class="{badge_cls}">{badge_txt}</span></td>
        </tr>"""
    return rows


def render_sonar_section(data: dict) -> str:
    if not data:
        return '<p class="no-data">SonarQube results not available.</p>'

    m           = data.get("measures", {})
    qg          = data.get("quality_gate", {})
    conditions  = qg.get("conditions", [])
    gate_status = qg.get("status", "UNKNOWN")
    ok          = gate_ok(gate_status)
    sonar_url   = data.get("sonar_url", "#")

    bugs        = fmt_num(_v(m, "bugs",         "0"))
    vulns       = fmt_num(_v(m, "vulnerabilities", "0"))
    smells      = fmt_num(_v(m, "code_smells",  "0"))
    hotspots    = fmt_num(_v(m, "security_hotspots", "0"))
    coverage    = fmt_pct(_v(m, "coverage",     ""))
    duplication = fmt_pct(_v(m, "duplicated_lines_density", ""))
    ncloc       = fmt_num(_v(m, "ncloc",        "0"))
    debt_raw    = _v(m, "sqale_index", "")
    tech_debt   = fmt_debt(debt_raw) if debt_raw not in ("—", "") else "—"
    debt_ratio  = fmt_pct(_v(m, "sqale_debt_ratio", ""))

    rel_raw     = _v(m, "reliability_rating",    "")
    sec_raw     = _v(m, "security_rating",       "")
    maint_raw   = _v(m, "maintainability_rating","")
    rel_let     = rating_letter(rel_raw)
    sec_let     = rating_letter(sec_raw)
    maint_let   = rating_letter(maint_raw)
    rel_bg_c    = rating_bg(rel_raw)
    sec_bg_c    = rating_bg(sec_raw)
    maint_bg_c  = rating_bg(maint_raw)

    blocker     = fmt_num(_v(m, "blocker_violations",  "0"))
    critical    = fmt_num(_v(m, "critical_violations", "0"))
    major       = fmt_num(_v(m, "major_violations",    "0"))
    minor       = fmt_num(_v(m, "minor_violations",    "0"))
    info_v      = fmt_num(_v(m, "info_violations",     "0"))

    gate_label  = "Quality Gate Passed" if ok else "Quality Gate Failed"
    gate_cls    = "ok" if ok else "fail"
    cond_rows   = _condition_rows(conditions)

    return f"""
<div class="section-banner sonar-banner">
  <span class="section-icon">&#9679;</span>
  SonarQube Code Quality
  <span class="gate-badge-inline {gate_cls}">{esc(gate_label)}</span>
</div>

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
    <div class="csub">Maintainability</div>
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
    <div class="csub">Ratio: {esc(debt_ratio)}</div>
  </div>
</div>

<div class="sh"><h2>Quality Ratings</h2></div>
<div class="ratings">
  <div class="rating-card">
    <div class="rating-badge" style="background:{esc(rel_bg_c)}">{esc(rel_let)}</div>
    <div class="rating-info">
      <div class="ri-label">Rating</div>
      <div class="ri-name">Reliability</div>
      <div class="ri-sub">{esc(bugs)} bug(s)</div>
    </div>
  </div>
  <div class="rating-card">
    <div class="rating-badge" style="background:{esc(sec_bg_c)}">{esc(sec_let)}</div>
    <div class="rating-info">
      <div class="ri-label">Rating</div>
      <div class="ri-name">Security</div>
      <div class="ri-sub">{esc(vulns)} vulnerability(s)</div>
    </div>
  </div>
  <div class="rating-card">
    <div class="rating-badge" style="background:{esc(maint_bg_c)}">{esc(maint_let)}</div>
    <div class="rating-info">
      <div class="ri-label">Rating</div>
      <div class="ri-name">Maintainability</div>
      <div class="ri-sub">Debt: {esc(tech_debt)}</div>
    </div>
  </div>
</div>

<div class="sh"><h2>Issues by Severity</h2></div>
<div class="sev-grid">
  <div class="sev-card"><div class="sev-dot" style="background:#7c3aed"></div>
    <div class="sev-val">{esc(blocker)}</div><div class="sev-lbl">Blocker</div></div>
  <div class="sev-card"><div class="sev-dot" style="background:#dc2626"></div>
    <div class="sev-val">{esc(critical)}</div><div class="sev-lbl">Critical</div></div>
  <div class="sev-card"><div class="sev-dot" style="background:#d97706"></div>
    <div class="sev-val">{esc(major)}</div><div class="sev-lbl">Major</div></div>
  <div class="sev-card"><div class="sev-dot" style="background:#2563eb"></div>
    <div class="sev-val">{esc(minor)}</div><div class="sev-lbl">Minor</div></div>
  <div class="sev-card"><div class="sev-dot" style="background:#64748b"></div>
    <div class="sev-val">{esc(info_v)}</div><div class="sev-lbl">Info</div></div>
</div>

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
<div style="margin-bottom:20px">
  <a class="link-out" href="{esc(sonar_url)}" target="_blank">&#8599; View full report in SonarQube</a>
</div>"""


# ── Trivy helpers ─────────────────────────────────────────────────────────────

def render_trivy_section(data: dict) -> str:
    if not data:
        return '<p class="no-data">Trivy results not available.</p>'

    summary  = data.get("summary", {})
    total    = summary.get("total", 0)
    by_sev   = summary.get("by_severity", {})
    vulns    = data.get("vulnerabilities", [])
    scanned  = data.get("scanned_at", "")[:19].replace("T", " ") + " UTC" if data.get("scanned_at") else "—"

    sev_cards = ""
    for sev in SEV_ORDER:
        count = by_sev.get(sev, 0)
        sev_cards += f"""
  <div class="card" style="border-top:3px solid {SEV_COLOR[sev]}">
    <div class="clbl">{esc(sev)}</div>
    <div class="cval" style="color:{SEV_COLOR[sev]}">{count}</div>
    <div class="csub">vulnerabilities</div>
  </div>"""

    sorted_vulns = sorted(vulns, key=lambda v: SEV_ORDER.index(v.get("severity", "UNKNOWN")))
    vuln_rows = ""
    for v in sorted_vulns:
        sev     = v.get("severity", "UNKNOWN")
        color   = SEV_COLOR.get(sev, "#64748b")
        bg      = SEV_BG.get(sev, "#f8fafc")
        vid     = v.get("vuln_id", "")
        url     = v.get("primary_url", "")
        vid_html = f'<a href="{esc(url)}" target="_blank">{esc(vid)}</a>' if url else esc(vid)
        title   = v.get("title", "") or v.get("description", "")[:120]
        cvss    = v.get("cvss_score", "")
        target  = v.get("target", "")
        vuln_rows += f"""
      <tr style="border-left:3px solid {color}">
        <td class="mono" style="font-size:11px">{vid_html}</td>
        <td>{esc(v.get('pkg_name',''))}</td>
        <td class="mono" style="font-size:11px">{esc(v.get('installed_version',''))}</td>
        <td class="mono" style="font-size:11px">{esc(v.get('fixed_version','—'))}</td>
        <td><span style="background:{bg};color:{color};font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;display:inline-block">{esc(sev)}</span></td>
        <td class="mono" style="font-size:11px">{esc(cvss)}</td>
        <td style="font-size:12px;max-width:280px">{esc(title[:100])}</td>
        <td style="font-size:10px;color:#64748b;max-width:160px">{esc(target)}</td>
      </tr>"""

    if not vuln_rows:
        vuln_rows = '<tr><td colspan="8" class="empty-cell">No vulnerabilities found. &#10003;</td></tr>'

    trivy_status = "CLEAN" if total == 0 else (
        f"{by_sev.get('CRITICAL', 0)} CRITICAL, {by_sev.get('HIGH', 0)} HIGH"
    )
    trivy_cls = "ok" if total == 0 or (by_sev.get("CRITICAL", 0) == 0 and by_sev.get("HIGH", 0) == 0) else "fail"

    return f"""
<div class="section-banner trivy-banner">
  <span class="section-icon">&#9670;</span>
  Trivy Source-Code Security Scan
  <span class="gate-badge-inline {trivy_cls}">{esc(trivy_status)}</span>
  <span style="font-size:11px;font-weight:400;opacity:.75;margin-left:12px">Scanned: {esc(scanned)}</span>
</div>

<div class="sh"><h2>Vulnerability Summary</h2></div>
<div class="cards">{sev_cards}
  <div class="card" style="border-top:3px solid #334155">
    <div class="clbl">Total</div>
    <div class="cval">{total}</div>
    <div class="csub">all severities</div>
  </div>
</div>

<div class="sh"><h2>Vulnerability Details</h2></div>
<div class="tbl-wrap" style="overflow-x:auto">
  <table>
    <thead>
      <tr>
        <th>CVE ID</th>
        <th>Package</th>
        <th>Installed</th>
        <th>Fixed In</th>
        <th>Severity</th>
        <th>CVSS</th>
        <th>Title</th>
        <th>Target</th>
      </tr>
    </thead>
    <tbody>{vuln_rows}</tbody>
  </table>
</div>"""


# ── full HTML page ────────────────────────────────────────────────────────────

def render_html(sonar: dict, trivy: dict) -> str:
    project_name = sonar.get("project_name", sonar.get("project_key", "DFC Coffee Ticketing"))
    run_number   = sonar.get("run_number", "") or trivy.get("run_number", "—")
    branch       = sonar.get("branch", "") or trivy.get("branch", "main")
    commit       = sonar.get("commit", "") or trivy.get("commit", "—")
    repository   = sonar.get("repository", "") or trivy.get("repository", "")
    fetched_at   = sonar.get("fetched_at", "")[:19].replace("T", " ") + " UTC" if sonar.get("fetched_at") else "—"

    sonar_gate_ok = gate_ok(sonar.get("quality_gate", {}).get("status", "UNKNOWN")) if sonar else False
    trivy_counts  = trivy.get("summary", {}).get("by_severity", {}) if trivy else {}
    trivy_clean   = trivy_counts.get("CRITICAL", 0) == 0

    overall_ok  = sonar_gate_ok and trivy_clean
    overall_cls = "ok" if overall_ok else "fail"
    overall_lbl = "All Checks Passed" if overall_ok else "Checks Failed"

    sonar_section = render_sonar_section(sonar)
    trivy_section = render_trivy_section(trivy)

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CI Report · {esc(project_name)}</title>
  <style>
    *,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
    :root{{
      --g:#16a34a;--gb:#dcfce7;--r:#dc2626;--rb:#fee2e2;
      --a:#d97706;--ab:#fef3c7;--b:#2563eb;--bb:#dbeafe;
      --ink:#0f172a;--ink2:#334155;--ink3:#64748b;
      --surface:#fff;--page:#f8fafc;--bd:#e2e8f0;--rad:12px;
    }}
    body{{font-family:Arial,Helvetica,sans-serif;background:var(--page);color:var(--ink);font-size:14px}}

    .hdr{{background:var(--ink);padding:24px 40px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px}}
    .hdr-left h1{{font-size:18px;font-weight:700;color:#fff}}
    .hdr-left .sub{{font-size:11px;color:#94a3b8;font-family:monospace;margin-top:4px}}
    .overall-badge{{display:inline-flex;align-items:center;gap:8px;padding:7px 18px;border-radius:100px;font-size:13px;font-weight:700}}
    .overall-badge.ok{{background:#15803d;color:#fff}}
    .overall-badge.fail{{background:#b91c1c;color:#fff}}
    .dot{{width:8px;height:8px;border-radius:50%;flex-shrink:0}}
    .ok .dot{{background:#4ade80}}
    .fail .dot{{background:#fca5a5}}
    .run-meta{{font-size:11px;color:#94a3b8;font-family:monospace;margin-top:5px;text-align:right}}

    .main{{padding:24px 40px;max-width:1300px}}

    .section-banner{{display:flex;align-items:center;gap:10px;padding:14px 20px;border-radius:var(--rad);margin:28px 0 18px;font-size:15px;font-weight:700;color:#fff}}
    .sonar-banner{{background:linear-gradient(135deg,#1e40af,#2563eb)}}
    .trivy-banner{{background:linear-gradient(135deg,#7c3aed,#a855f7)}}
    .section-icon{{font-size:12px;opacity:.8}}
    .gate-badge-inline{{padding:3px 12px;border-radius:100px;font-size:11px;font-weight:700;margin-left:auto}}
    .gate-badge-inline.ok{{background:#15803d}}
    .gate-badge-inline.fail{{background:#b91c1c}}

    .sh{{display:flex;align-items:center;gap:10px;margin-bottom:12px;margin-top:20px}}
    .sh h2{{font-size:14px;font-weight:700}}
    .pill{{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 9px;border-radius:100px}}
    .pill-g{{background:var(--gb);color:var(--g)}}
    .pill-r{{background:var(--rb);color:var(--r)}}

    .cards{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}}
    .card{{background:var(--surface);border:1px solid var(--bd);border-radius:var(--rad);padding:14px 12px 12px;position:relative;overflow:hidden}}
    .card.cbug::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#dc2626}}
    .card.cvuln::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#d97706}}
    .card.csmell::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#2563eb}}
    .card.cspot::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#7c3aed}}
    .card.ccov::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#0891b2}}
    .card.cdup::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#64748b}}
    .card.cloc::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#334155}}
    .card.cdebt::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#8b5cf6}}
    .clbl{{font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--ink3);margin-bottom:6px}}
    .cval{{font-size:26px;font-weight:800;line-height:1;color:var(--ink)}}
    .cval.red{{color:#dc2626}}.cval.amber{{color:#d97706}}.cval.blue{{color:#2563eb}}
    .cval.purple{{color:#7c3aed}}.cval.teal{{color:#0891b2}}.cval.slate{{color:#475569}}
    .csub{{font-size:10px;color:var(--ink3);margin-top:4px}}

    .ratings{{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}}
    .rating-card{{background:var(--surface);border:1px solid var(--bd);border-radius:var(--rad);padding:14px;display:flex;align-items:center;gap:14px}}
    .rating-badge{{width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0}}
    .rating-info .ri-label{{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink3)}}
    .rating-info .ri-name{{font-size:13px;font-weight:700;color:var(--ink);margin-top:3px}}
    .rating-info .ri-sub{{font-size:10px;color:var(--ink3);margin-top:2px}}

    .sev-grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px}}
    .sev-card{{background:var(--surface);border:1px solid var(--bd);border-radius:var(--rad);padding:12px;text-align:center}}
    .sev-dot{{width:10px;height:10px;border-radius:50%;display:inline-block;margin-bottom:6px}}
    .sev-val{{font-size:22px;font-weight:800;color:var(--ink)}}
    .sev-lbl{{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink3);margin-top:3px}}

    .tbl-wrap{{background:var(--surface);border:1px solid var(--bd);border-radius:var(--rad);overflow:hidden;margin-bottom:20px}}
    table{{width:100%;border-collapse:collapse}}
    thead th{{background:var(--ink);color:#fff;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:10px 12px;text-align:left}}
    tbody tr{{border-bottom:1px solid var(--bd)}}
    tbody tr:last-child{{border-bottom:none}}
    tbody tr:hover{{background:#fafbfc}}
    tbody td{{padding:9px 12px;vertical-align:middle}}
    .badge-ok{{background:var(--gb);color:var(--g);font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;display:inline-block}}
    .badge-fail{{background:var(--rb);color:var(--r);font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;display:inline-block}}
    .mono{{font-family:monospace}}
    .link-out{{font-size:12px;color:#2563eb;text-decoration:none;font-weight:600}}
    .link-out:hover{{text-decoration:underline}}
    .empty-cell{{text-align:center;padding:20px;color:#64748b}}
    .no-data{{color:#64748b;font-style:italic;padding:16px 0}}
    a{{color:#2563eb}}

    .footer{{padding:16px 40px;border-top:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--ink3);font-family:monospace}}

    @media print{{
      body{{background:#fff}}
      .hdr,.rating-badge,.section-banner,.sev-dot{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      thead th{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    }}
  </style>
</head>
<body>

<div class="hdr">
  <div class="hdr-left">
    <h1>CI Quality &amp; Security Report</h1>
    <div class="sub">
      {esc(repository or project_name)} &middot; Build #{esc(run_number)} &middot; Branch: {esc(branch)} &middot; Commit: {esc(commit)}
    </div>
  </div>
  <div>
    <div class="overall-badge {overall_cls}">
      <span class="dot"></span>{esc(overall_lbl)}
    </div>
    <div class="run-meta">{esc(fetched_at)}</div>
  </div>
</div>

<div class="main">
{sonar_section}
{trivy_section}
</div>

<div class="footer">
  <span>CI Quality &amp; Security Report &middot; {esc(project_name)} &middot; Build #{esc(run_number)}</span>
  <span>{esc(fetched_at)}</span>
</div>

</body>
</html>"""


# ── PDF writer ────────────────────────────────────────────────────────────────

def write_pdf(html_content: str, output_pdf: Path) -> None:
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise RuntimeError("WeasyPrint is required to generate the PDF.") from exc
    HTML(string=html_content, base_url=str(Path.cwd())).write_pdf(str(output_pdf))


# ── entry point ───────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate combined SonarQube + Trivy HTML/PDF report.")
    p.add_argument("--sonar-input",  default="sonar-results/sonar_results.json")
    p.add_argument("--trivy-input",  default="trivy-results/trivy_results.json")
    p.add_argument("--output-html",  default="reports/combined_report.html")
    p.add_argument("--output-pdf",   default="reports/combined_report.pdf")
    return p.parse_args()


def main() -> int:
    args        = parse_args()
    sonar_data  = _load(Path(args.sonar_input))
    trivy_data  = _load(Path(args.trivy_input))

    if not sonar_data:
        print(f"WARNING: {args.sonar_input} not found — SonarQube section will be empty.", file=sys.stderr)
    if not trivy_data:
        print(f"WARNING: {args.trivy_input} not found — Trivy section will be empty.", file=sys.stderr)

    out_html = Path(args.output_html)
    out_pdf  = Path(args.output_pdf)
    out_html.parent.mkdir(parents=True, exist_ok=True)
    out_pdf.parent.mkdir(parents=True, exist_ok=True)

    html_content = render_html(sonar_data, trivy_data)
    out_html.write_text(html_content, encoding="utf-8")
    print(f"Wrote HTML → {out_html}")

    try:
        write_pdf(html_content, out_pdf)
        print(f"Wrote PDF  → {out_pdf}")
    except Exception as exc:
        print(f"WARNING: PDF generation failed ({exc}) — HTML report is still available.", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
