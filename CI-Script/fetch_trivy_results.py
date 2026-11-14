#!/usr/bin/env python3
"""Process Trivy filesystem scan JSON output into a structured summary file.

Required env vars:
  TRIVY_RESULTS_FS    Path to raw Trivy filesystem scan JSON
                      (default: trivy-results/fs_results.json)
  TRIVY_RESULTS_JSON  Output path for the processed summary
                      (default: trivy-results/trivy_results.json)

Always exits 0 so downstream jobs can run regardless.
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]


def load_json(path: Path) -> dict:
    if not path.exists():
        print(f"  WARNING: {path} not found — using empty results.", file=sys.stderr)
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"  WARNING: failed to parse {path}: {exc}", file=sys.stderr)
        return {}


def _cvss_score(v: dict) -> str:
    best = 0.0
    for src in (v.get("CVSS") or {}).values():
        for key in ("V3Score", "V2Score"):
            try:
                best = max(best, float(src.get(key) or 0))
            except (TypeError, ValueError):
                pass
    return f"{best:.1f}" if best else ""


def extract_vulns(data: dict) -> list[dict]:
    vulns = []
    for result in data.get("Results") or []:
        target = result.get("Target", "")
        cls    = result.get("Class", "")
        typ    = result.get("Type", "")
        for v in result.get("Vulnerabilities") or []:
            vulns.append({
                "target":             target,
                "class":              cls,
                "type":               typ,
                "vuln_id":            v.get("VulnerabilityID", ""),
                "pkg_name":           v.get("PkgName", ""),
                "installed_version":  v.get("InstalledVersion", ""),
                "fixed_version":      v.get("FixedVersion", ""),
                "severity":           v.get("Severity", "UNKNOWN"),
                "title":              v.get("Title", ""),
                "description":        v.get("Description", ""),
                "primary_url":        v.get("PrimaryURL", ""),
                "cvss_score":         _cvss_score(v),
            })
    return vulns


def count_by_severity(vulns: list[dict]) -> dict[str, int]:
    c = Counter(v["severity"] for v in vulns)
    return {s: c.get(s, 0) for s in SEVERITIES}


def main() -> int:
    fs_path  = Path(os.environ.get("TRIVY_RESULTS_FS",   "trivy-results/fs_results.json"))
    out_path = Path(os.environ.get("TRIVY_RESULTS_JSON", "trivy-results/trivy_results.json"))

    print("Processing Trivy results...")
    fs_data = load_json(fs_path)
    vulns   = extract_vulns(fs_data)
    counts  = count_by_severity(vulns)

    payload = {
        "scanned_at":      datetime.now(timezone.utc).isoformat(),
        "run_number":      os.environ.get("GITHUB_RUN_NUMBER", ""),
        "branch":          os.environ.get("GITHUB_REF_NAME", "main"),
        "commit":          os.environ.get("GITHUB_SHA", "")[:7],
        "repository":      os.environ.get("GITHUB_REPOSITORY", ""),
        "summary": {
            "total":       len(vulns),
            "by_severity": counts,
        },
        "vulnerabilities": vulns,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"  Total vulnerabilities : {len(vulns)}")
    for sev in SEVERITIES:
        print(f"  {sev:<10}: {counts[sev]}")
    print(f"  Saved → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
