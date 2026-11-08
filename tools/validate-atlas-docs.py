#!/usr/bin/env python3
"""Validate the local Atlas source binding, project/work records and references.

Requires PyYAML; also jsonschema when --atlas-root points to a checkout of the
private Atlas repository. No network calls, no source mutation. Schema checks are
explicitly marked skipped unless the source-of-truth schemas are available.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from urllib.parse import urlsplit

STATUSES = {"Mentioned", "Proposed", "In Progress", "Verified", "Blocked", "Unknown"}
KINDS = {"milestone", "task", "thread"}
ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    raise ValueError(message)


def check_path(value: str, context: str) -> None:
    if not isinstance(value, str) or not value:
        fail(f"{context}: empty or non-string reference")
    if urlsplit(value).scheme in {"https", "http"}:
        return
    path = value.split("#", 1)[0]
    if not path:
        fail(f"{context}: empty path")
    target = (ROOT / path).resolve()
    if not target.is_relative_to(ROOT.resolve()) or not target.exists():
        fail(f"{context}: missing or escaping repository path {path}")


def load_yaml(path: Path):
    import yaml  # requires PyYAML, intentionally not hidden
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def validate() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--atlas-root", type=Path, help="Local checkout of private raskal-labs/atlas")
    args = parser.parse_args()

    bind = load_yaml(ROOT / ".atlas/project.yaml")
    state = load_yaml(ROOT / "PROJECT.yaml")
    work = load_yaml(ROOT / "WORK.yaml")
    if bind.get("version") != 2:
        fail("expected binding version 2")
    ident = bind.get("project", {}).get("id")
    projects = state.get("projects")
    if state.get("version") != 1 or not isinstance(projects, dict) or ident not in projects:
        fail("bound project id not found in PROJECT.yaml version 1")
    if work.get("version") != 1 or work.get("project") != ident:
        fail("WORK.yaml project/version mismatch")
    if bind.get("git", {}).get("authoritative_branch") != "main":
        fail("unexpected authoritative branch; confirm before changing validator")

    for role, entry in bind.get("authority", {}).items():
        if isinstance(entry, dict):
            check_path(entry["path"], f"binding authority.{role}")
        elif isinstance(entry, str):
            check_path(entry, f"binding authority.{role}")
        else:
            fail(f"binding authority.{role}: unexpected type")

    record = projects[ident]
    for key in ("title", "parent", "purpose", "status", "current", "next_checkpoint", "issues"):
        if key not in record:
            fail(f"PROJECT.yaml missing required field {key}")
    if record["status"] not in STATUSES:
        fail("invalid project status")
    if record["status"] == "Verified" and not record.get("evidence"):
        fail("Verified project needs evidence")
    for i, issue in enumerate(record.get("issues") or []):
        if not all(issue.get(k) for k in ("id", "kind", "text", "source")):
            fail(f"issue {i} missing required field")
        check_path(issue["source"], f"issue {issue['id']}")
    for ref in record.get("evidence") or []:
        check_path(ref, "project evidence")

    items = work.get("items")
    if not isinstance(items, list):
        fail("work items must be a list")
    ids = set()
    for item in items:
        ident2 = item.get("id")
        if not isinstance(ident2, str) or not ident2:
            fail("work item without stable id")
        if ident2 in ids:
            fail(f"duplicate work id: {ident2}")
        ids.add(ident2)
        if item.get("kind") not in KINDS:
            fail(f"{ident2}: unexpected kind")
        if not item.get("title"):
            fail(f"{ident2}: no title")
        if item.get("status") is not None and item["status"] not in STATUSES:
            fail(f"{ident2}: invalid status")
        if item["kind"] in {"milestone", "task"} and "acceptance" not in item:
            fail(f"{ident2}: missing acceptance")
        if item["kind"] == "milestone" and item.get("status") is None:
            fail(f"{ident2}: milestone needs a status")
        if item.get("status") == "Verified" and not item.get("evidence"):
            fail(f"{ident2}: Verified with no evidence")
        for ref in item.get("evidence") or []:
            check_path(ref, f"{ident2} evidence")
    parents = {item["id"]: item.get("parent") for item in items}
    for ident2, parent in parents.items():
        if parent and parent not in ids:
            fail(f"{ident2}: missing parent id {parent}")
        seen = {ident2}
        while parent:
            if parent in seen:
                fail(f"{ident2}: parent cycle")
            seen.add(parent)
            parent = parents[parent]

    if args.atlas_root:
        try:
            import jsonschema
        except ImportError:
            raise RuntimeError("Install jsonschema for --atlas-root validation")
        schema_root = args.atlas_root / "project-state/schema"
        for payload, filename in (
            (state, "project-document.schema.json"),
            (work, "work-document.schema.json"),
        ):
            schema_path = schema_root / filename
            schema = json.loads(schema_path.read_text(encoding="utf-8"))
            jsonschema.Draft202012Validator.check_schema(schema)
            jsonschema.validate(payload, schema)
        print("PASS: Atlas JSON Schema validation (source schemas from", args.atlas_root, ")")
    else:
        print("SKIPPED: official Atlas JSON Schema validation; provide --atlas-root")
    print(f"PASS: source refs, authority mapping, IDs, work links and required fields ({len(items)} items)")


if __name__ == "__main__":
    try:
        validate()
    except ImportError as error:
        print(f"NOT RUN: missing dependency: {error}; install PyYAML", file=sys.stderr)
        sys.exit(2)
    except (ValueError, OSError, RuntimeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
