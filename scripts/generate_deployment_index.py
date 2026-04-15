#!/usr/bin/env python3
"""
generate_deployment_index.py
-----------------------------
Regenerate the Deployment Index sub-subpage HTML for a given branch from
`git log`. Emits the exact 5-column table structure the page expects:

    Local Time Stamp | Commit | Summary | Description | UTC Time Stamps

Why:
  The Deployment Index is a log of every commit that ever landed on a given
  environment branch. Rather than maintain hand-written rows, the file that
  the browser loads IS generated from git log on every deploy. Full
  regenerate (not append) makes the output self-healing if history is ever
  amended or backfilled.

Rendering contract (see js/main.js :: initializeDeploymentIndexPage):
  - `.local-timestamp` cells carry `data-utc="<ISO 8601 Z>"`. JS overwrites
    the inner <p> text with the user's chosen time zone on page load. The
    text we render here is a fallback (shown before JS runs, and if JS fails).
  - Commit cell shows the short SHA.
  - Summary cell = commit subject.
  - Description cell = commit body (may be empty).
  - UTC Time Stamps cell = "YYYYMMDDHHMM UTC".

Usage:
  python3 scripts/generate_deployment_index.py \
      --branch development \
      --out pages/development/deployment-index/development/index.html
"""

from __future__ import annotations

import argparse
import html
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    print("zoneinfo unavailable; requires Python 3.9+", file=sys.stderr)
    sys.exit(1)


# ── Record separator characters (unlikely to appear in commit text) ──────────
FIELD_SEP = "\x1f"   # ASCII Unit Separator
RECORD_SEP = "\x1e"  # ASCII Record Separator

TITLE_BY_BRANCH = {
    "development": "Development",
    "sandbox": "Sandbox",
    "production": "Production",
}


def run_git_log(branch: str, repo_root: Path) -> str:
    """Return raw git-log output for `branch`, newest first."""
    # Format: SHA | committer-date (ISO strict UTC) | subject | body
    # Use %H for full SHA; we'll shorten to 7 chars in Python.
    fmt = f"%H{FIELD_SEP}%cI{FIELD_SEP}%s{FIELD_SEP}%b{RECORD_SEP}"
    result = subprocess.run(
        ["git", "log", branch, f"--pretty=format:{fmt}", "--date=iso-strict"],
        capture_output=True,
        text=True,
        cwd=repo_root,
        check=True,
    )
    return result.stdout


def parse_log(raw: str) -> list[dict]:
    """Parse the git-log output into a list of commit dicts."""
    commits = []
    for chunk in raw.split(RECORD_SEP):
        chunk = chunk.strip("\n")
        if not chunk:
            continue
        parts = chunk.split(FIELD_SEP)
        if len(parts) < 4:
            continue
        sha, iso, subject, body = parts[0], parts[1], parts[2], parts[3]
        commits.append({
            "sha": sha,
            "short_sha": sha[:7],
            "iso": iso,
            "subject": subject.strip(),
            "body": body.strip(),
        })
    return commits


def to_utc_iso_z(iso_in: str) -> str:
    """Normalise git's ISO date (may be +0000 or with offset) to 'Z' form."""
    # git --date=iso-strict gives "2026-04-14T15:35:20+00:00" on a UTC repo.
    dt = datetime.fromisoformat(iso_in)
    dt_utc = dt.astimezone(timezone.utc)
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def format_utc_compact(iso_in: str) -> str:
    """'2026-04-14T15:35:20+00:00' → '2026-04-14 15:35 UTC'."""
    dt = datetime.fromisoformat(iso_in).astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M") + " UTC"


def format_pdt_compact(iso_in: str, tz_name: str = "America/Los_Angeles") -> str:
    """Fallback local-timestamp text shown before JS rewrites it.

    Format: 'YYYY-MM-DD HH:MM PDT/PST'. JS overwrites this on page load
    with the user's chosen time zone, in the same format.
    """
    dt = datetime.fromisoformat(iso_in).astimezone(ZoneInfo(tz_name))
    suffix = dt.tzname() or "LOCAL"  # "PDT" or "PST"
    return dt.strftime("%Y-%m-%d %H:%M") + " " + suffix


def esc(text: str) -> str:
    """HTML-escape for emission inside <p>."""
    return html.escape(text, quote=True)


def body_as_paragraph(body: str) -> str:
    """Commit bodies often contain multi-line prose and soft wraps.

    Collapse internal newlines to spaces so the <p> renders as a single
    paragraph that wraps naturally inside the description column (which is
    pixel-capped to ~66 chars). Blank lines (paragraph breaks in commit
    bodies) become a single space too — the column is narrow enough that
    paragraph breaks would look arbitrary.
    """
    if not body:
        return ""
    # Collapse all runs of whitespace (including newlines) into single spaces.
    return " ".join(body.split())


def render_row(commit: dict) -> str:
    iso_z = to_utc_iso_z(commit["iso"])
    local_fallback = format_pdt_compact(commit["iso"])
    utc_compact = format_utc_compact(commit["iso"])
    summary = esc(commit["subject"])
    description = esc(body_as_paragraph(commit["body"]))
    short_sha = esc(commit["short_sha"])
    return (
        "        <tr class=\"table-body-row\">\n"
        f"          <td class=\"table-body-cell local-timestamp\" data-utc=\"{iso_z}\"><div class=\"cell-fit\"><p>{local_fallback}</p></div></td>\n"
        f"          <td class=\"table-body-cell\"><div class=\"cell-fit\"><p>{short_sha}</p></div></td>\n"
        f"          <td class=\"table-body-cell summary-cell\"><div class=\"cell-fit\"><p>{summary}</p></div></td>\n"
        f"          <td class=\"table-body-cell description-cell\"><div class=\"cell-fit\"><p>{description}</p></div></td>\n"
        f"          <td class=\"table-body-cell\"><div class=\"cell-fit\"><p>{utc_compact}</p></div></td>\n"
        "        </tr>"
    )


def render_page(branch: str, commits: list[dict]) -> str:
    title = TITLE_BY_BRANCH.get(branch, branch.capitalize())
    rows = "\n".join(render_row(c) for c in commits) if commits else ""
    # Search bar: text_input_component_engine renders into the per-environment
    # slot; main.js wires it up on subpageLoaded. data-search-scope tells the
    # filter logic which .table-main this search is bound to.
    return (
        f"<div class=\"table-outer\" data-search-scope=\"{branch}\">\n"
        f"  <div class=\"table-title\">\n"
        f"    <h2>Deployment Index — {title}</h2>\n"
        f"  </div>\n"
        f"  <div class=\"deployment-index-search\" id=\"deployment-index-search-{branch}\"></div>\n"
        f"  <div class=\"table-body\">\n"
        f"    <table class=\"table-main\">\n"
        f"      <thead>\n"
        f"        <tr class=\"table-header-row\">\n"
        f"          <th class=\"table-header-cell\"><div class=\"cell-fit\"><h3>Local Time Stamp</h3></div></th>\n"
        f"          <th class=\"table-header-cell\"><div class=\"cell-fit\"><h3>Commit</h3></div></th>\n"
        f"          <th class=\"table-header-cell summary-cell\"><div class=\"cell-fit\"><h3>Summary</h3></div></th>\n"
        f"          <th class=\"table-header-cell description-cell\"><div class=\"cell-fit\"><h3>Description</h3></div></th>\n"
        f"          <th class=\"table-header-cell\"><div class=\"cell-fit\"><h3>UTC Time Stamps</h3></div></th>\n"
        f"        </tr>\n"
        f"      </thead>\n"
        f"      <tbody>\n"
        f"{rows}\n"
        f"      </tbody>\n"
        f"    </table>\n"
        f"  </div>\n"
        f"</div>\n"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--branch", required=True,
                    help="Branch name (development | sandbox | production).")
    ap.add_argument("--out", default=None,
                    help="Output HTML path, relative to repo root or absolute. "
                         "Required unless --dry-run is given.")
    ap.add_argument("--repo-root", default=None,
                    help="Repo root. Defaults to git rev-parse --show-toplevel.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print HTML to stdout instead of writing to --out.")
    args = ap.parse_args()

    if args.repo_root:
        repo_root = Path(args.repo_root).resolve()
    else:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        )
        repo_root = Path(result.stdout.strip()).resolve()

    raw = run_git_log(args.branch, repo_root)
    commits = parse_log(raw)
    html_out = render_page(args.branch, commits)

    if args.dry_run:
        sys.stdout.write(html_out)
        return 0

    if not args.out:
        print("--out is required unless --dry-run is given.", file=sys.stderr)
        return 2

    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = (repo_root / out_path).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_out, encoding="utf-8")
    print(f"[deployment-index] Wrote {len(commits)} rows → {out_path}",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
