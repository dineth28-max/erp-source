#!/usr/bin/env python3
"""Fetch SonarQube project metrics and quality gate status, save as JSON.

Required env vars:
  SONAR_HOST_URL      e.g. https://sonarqube.example.com
  SONAR_TOKEN         project/user token
  SONAR_PROJECT_KEY   e.g. my-project

Optional env vars:
  SONAR_PROJECT_NAME  display name (defaults to project key)
  SONAR_RESULTS_JSON  output path (defaults to sonar-results/sonar_results.json)

Always exits 0 and always writes a JSON file so downstream jobs can run.
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ALL_METRICS = [
    "alert_status",
    "bugs",
    "vulnerabilities",
    "code_smells",
    "security_hotspots",
    "coverage",
    "duplicated_lines_density",
    "ncloc",
    "reliability_rating",
    "security_rating",
    "maintainability_rating",
    "sqale_debt_ratio",
    "sqale_index",
    "blocker_violations",
    "critical_violations",
    "major_violations",
    "minor_violations",
    "info_violations",
    "new_bugs",
    "new_vulnerabilities",
    "new_code_smells",
    "new_coverage",
    "new_duplicated_lines_density",
]


def _auth_header(token: str) -> dict[str, str]:
    creds = base64.b64encode(f"{token}:".encode()).decode()
    return {"Authorization": f"Basic {creds}"}


def _get(url: str, token: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={**_auth_header(token), "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def _read_error_body(exc: urllib.error.HTTPError) -> str:
    try:
        return exc.read().decode("utf-8", errors="replace")
    except Exception:
        return ""


def _unknown_keys_from_body(body: str) -> set[str]:
    """Parse keys listed in SonarQube 'not found' error message."""
    try:
        for err in json.loads(body).get("errors", []):
            m = re.search(r"not found:\s*(.+)$", err.get("msg", ""))
            if m:
                return {k.strip() for k in m.group(1).split(",")}
    except Exception:
        pass
    return set()


def fetch_measures(host: str, token: str, project_key: str) -> dict[str, str]:
    """Fetch measures, automatically dropping any metric keys not found."""
    keys = list(ALL_METRICS)

    while keys:
        url = (
            f"{host}/api/measures/component"
            f"?component={urllib.parse.quote(project_key)}"
            f"&metricKeys={','.join(keys)}"
        )
        try:
            data = _get(url, token)
            measures: dict[str, str] = {}
            for m in data.get("component", {}).get("measures", []):
                value = m.get("value") or (m.get("period") or {}).get("value") or ""
                measures[m["metric"]] = value
            return measures
        except urllib.error.HTTPError as exc:
            body = _read_error_body(exc)
            unknown = _unknown_keys_from_body(body)
            if unknown:
                print(f"  Skipping unsupported metric(s): {', '.join(sorted(unknown))}")
                keys = [k for k in keys if k not in unknown]
            else:
                print(f"  WARNING: measures API failed (HTTP {exc.code}): {body}", file=sys.stderr)
                return {}

    return {}


def fetch_quality_gate(host: str, token: str, project_key: str) -> dict:
    url = (
        f"{host}/api/qualitygates/project_status"
        f"?projectKey={urllib.parse.quote(project_key)}"
    )
    try:
        return _get(url, token).get("projectStatus", {})
    except urllib.error.HTTPError as exc:
        body = _read_error_body(exc)
        print(f"  WARNING: quality gate API failed (HTTP {exc.code}): {body}", file=sys.stderr)
        return {"status": "UNKNOWN", "conditions": []}


def fetch_project_info(host: str, token: str, project_key: str) -> dict:
    try:
        return _get(
            f"{host}/api/components/show?component={urllib.parse.quote(project_key)}",
            token,
        ).get("component", {})
    except Exception:
        return {}


def main() -> int:
    host         = os.environ.get("SONAR_HOST_URL", "").rstrip("/")
    token        = os.environ.get("SONAR_TOKEN", "")
    project_key  = os.environ.get("SONAR_PROJECT_KEY", "test")
    project_name = os.environ.get("SONAR_PROJECT_NAME", project_key)
    output_path  = Path(os.environ.get("SONAR_RESULTS_JSON", "sonar-results/sonar_results.json"))

    error_state = not host or not token
    if not host:
        print("ERROR: SONAR_HOST_URL is not set — writing error-state JSON.", file=sys.stderr)
    if not token:
        print("ERROR: SONAR_TOKEN is not set — writing error-state JSON.", file=sys.stderr)

    measures, quality_gate = {}, {"status": "UNKNOWN", "conditions": []}

    if not error_state:
        print(f"Fetching SonarQube results for: {project_key}")
        try:
            measures     = fetch_measures(host, token, project_key)
            quality_gate = fetch_quality_gate(host, token, project_key)
            project_info = fetch_project_info(host, token, project_key)
            project_name = project_info.get("name") or project_name
        except Exception as exc:
            print(f"  WARNING: unexpected error: {exc}", file=sys.stderr)

    payload = {
        "project_key":  project_key,
        "project_name": project_name,
        "fetched_at":   datetime.now(timezone.utc).isoformat(),
        "run_number":   os.environ.get("GITHUB_RUN_NUMBER", ""),
        "branch":       os.environ.get("GITHUB_REF_NAME", "main").replace("refs/heads/", ""),
        "commit":       os.environ.get("GITHUB_SHA", "")[:7],
        "repository":   os.environ.get("GITHUB_REPOSITORY", ""),
        "sonar_url":    f"{host}/dashboard?id={urllib.parse.quote(project_key)}" if host else "#",
        "quality_gate": quality_gate,
        "measures":     measures,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    gate_status = quality_gate.get("status", "UNKNOWN")
    print(f"  Quality gate    : {gate_status}")
    print(f"  Bugs            : {measures.get('bugs', 'N/A')}")
    print(f"  Vulnerabilities : {measures.get('vulnerabilities', 'N/A')}")
    print(f"  Code smells     : {measures.get('code_smells', 'N/A')}")
    print(f"  Coverage        : {measures.get('coverage', 'N/A')}%")
    print(f"  Saved → {output_path}")
    return 0  # always exit 0 so the artifact upload and downstream jobs always run


if __name__ == "__main__":
    sys.exit(main())
