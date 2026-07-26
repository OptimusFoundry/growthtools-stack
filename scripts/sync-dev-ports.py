#!/usr/bin/env python3
"""Sync a product repo's local dev config against the shared port/name registry.

Copy this file into a product repo as scripts/sync-dev-ports.py, alongside
sync-dev-ports-selftest. It locates the registry, works out which product it is
from the git remote, then:

  --check   (default) verify committed config (compose, env.test,
            env.local.example) and env.local against the registry. Exit 1 on
            any mismatch. Safe to run in CI.
  --apply   rewrite env.local in place so it matches. env.local is gitignored,
            so it is the one file a PR can never fix for you — hence the only
            file this writes. Committed files are reported, never edited: those
            changes belong in a reviewed commit.

Standard library only, by design: these repos forbid adding pyyaml to tooling,
which is also why the registry is JSON.

The registry repo is private, so an anonymous HTTP fetch is not an option. It is
located in this order, and discovery is by marker file rather than by directory
name so that renaming the registry again costs nothing:

  1. --registry <path|url>
  2. $ENV_REGISTRY  ($DEV_PORTS_REGISTRY still works, with a warning)
  3. a sibling checkout holding a registry.json with a schema_version
  4. gh api against SAVentures/env-registry, then SAVentures/dev-ports
  5. failure, naming all three fixes

  python3 scripts/sync-dev-ports.py                 # check
  python3 scripts/sync-dev-ports.py --apply         # fix env.local
  python3 scripts/sync-dev-ports.py --registry ../env-registry/registry.json
  ./scripts/sync-dev-ports-selftest                 # verify the script itself
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request

DEFAULT_REPO = "SAVentures/env-registry"
LEGACY_REPO = "SAVentures/dev-ports"
MARKER_KEY = "schema_version"

# Keys this tool owns in env files. Everything else is left untouched.
#   name -> (registry lookup, formatter)
MANAGED = {
    "DB_PORT": lambda p, tier: str(p["infra_ports"]["db_dev" if tier == "local" else "db_test"]),
    "KAFKA_BROKERS": lambda p, tier: "localhost:%d" % p["infra_ports"]["kafka_dev" if tier == "local" else "kafka_test"],
    "PRODUCT_NAME": lambda p, tier: p["product_name"],
}

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"
if not sys.stdout.isatty() or os.environ.get("NO_COLOR"):
    GREEN = RED = YELLOW = DIM = RESET = ""


def _read_source(src):
    """Read a registry from a filesystem path or an http(s) URL."""
    if re.match(r"^https?://", src):
        with urllib.request.urlopen(src, timeout=15) as r:
            return r.read().decode()
    with open(src) as f:
        return f.read()


def find_sibling_registry(root):
    """Locate a sibling checkout holding registry.json, by marker not by name.

    Keyed on registry.json rather than catalog.json so this resolver can ship
    before the catalog exists — see the migration ordering hazard in the spec.
    Name-independent so the next rename costs nothing.
    """
    if not root:
        return None
    workspace = os.path.dirname(os.path.abspath(root))
    try:
        entries = sorted(os.listdir(workspace))
    except OSError:
        return None
    for name in entries:
        cand = os.path.join(workspace, name, "registry.json")
        if not os.path.isfile(cand):
            continue
        try:
            with open(cand) as f:
                if MARKER_KEY in json.load(f):
                    return cand
        except (ValueError, OSError):
            continue
    return None


def gh_raw(repo, path, runner=None):
    """Fetch a file from a private repo through the authenticated gh CLI."""
    runner = runner or subprocess.run
    try:
        p = runner(["gh", "api", "repos/%s/contents/%s" % (repo, path),
                    "-H", "Accept: application/vnd.github.raw"],
                   capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    if p.returncode != 0 or not p.stdout.strip():
        return None
    return p.stdout


def resolve_registry(explicit=None, root=None, runner=None):
    """Find registry.json. Returns (label, text); raises RuntimeError if unfound.

    Order: explicit flag, $ENV_REGISTRY, sibling checkout, authenticated gh api.
    The gh step tries the new repo name first and the old one second, so this
    identical script works both before and after the rename.
    """
    if explicit:
        return explicit, _read_source(explicit)

    env_new = os.environ.get("ENV_REGISTRY")
    if env_new:
        return env_new, _read_source(env_new)
    env_old = os.environ.get("DEV_PORTS_REGISTRY")
    if env_old:
        sys.stderr.write("%sDEV_PORTS_REGISTRY is deprecated; use ENV_REGISTRY.%s\n"
                         % (YELLOW, RESET))
        return env_old, _read_source(env_old)

    sibling = find_sibling_registry(root if root is not None else repo_root())
    if sibling:
        return sibling, _read_source(sibling)

    for repo in (DEFAULT_REPO, LEGACY_REPO):
        text = gh_raw(repo, "registry.json", runner=runner)
        if text:
            return "gh:" + repo, text

    raise RuntimeError(
        "Could not locate the registry. Any one of these fixes it:\n"
        "  clone it beside this repo:  git clone git@github.com:%s.git\n"
        "  point at it directly:       ENV_REGISTRY=/path/to/registry.json\n"
        "  authenticate the CLI:       gh auth login" % DEFAULT_REPO)


def script_sha256():
    """Hex digest of this script file, for vendored-copy freshness checks."""
    with open(os.path.abspath(__file__), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def check_script_freshness(reg):
    """Report, never fail, when this vendored copy differs from the canonical one."""
    want = (reg.get("script") or {}).get("sha256")
    if not want or want == script_sha256():
        return
    print("%sSTALE  %s this copy differs from the registry's canonical script" % (YELLOW, RESET))
    print("%s       re-copy it from the registry checkout before trusting a pass%s" % (DIM, RESET))


def repo_root():
    """Walk up from this script to the directory holding base-server/."""
    d = os.path.abspath(os.path.dirname(__file__))
    for _ in range(6):
        if os.path.isdir(os.path.join(d, "base-server")):
            return d
        d = os.path.dirname(d)
    return None


def git_remote_slug(root):
    """owner/name from origin's URL, or None. Stable across worktrees and clones."""
    try:
        url = subprocess.run(["git", "-C", root, "remote", "get-url", "origin"],
                             capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return None
    m = re.search(r"[:/]([^/:]+/[^/]+?)(?:\.git)?$", url)
    return m.group(1) if m else None


def find_product(reg, root, override):
    """Identify the product by git remote first.

    The checkout directory name is NOT reliable: inside a git worktree it is the
    worktree's name, not the repo's, and these repos use worktrees heavily. The
    remote survives worktrees, clones and directory renames.
    """
    if override:
        for p in reg["products"]:
            if override in (p["checkout_dir"], p["product_name"]):
                return p
        return None

    slug = git_remote_slug(root)
    if slug:
        for p in reg["products"]:
            if p["repo"].lower() == slug.lower():
                return p

    name = os.path.basename(root)
    for p in reg["products"]:
        if name in (p["checkout_dir"], p["product_name"]):
            return p
    return None


def read_env(path):
    """Return {key: (lineno, value)} for simple KEY=VALUE lines."""
    out = {}
    if not os.path.isfile(path):
        return None
    for i, line in enumerate(open(path).read().split("\n")):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
        if m:
            out[m.group(1)] = (i, m.group(2).strip())
    return out


def check_env(path, product, tier, problems, label):
    env = read_env(path)
    if env is None:
        print(f"  {DIM}{label}: absent{RESET}")
        return
    for key, fn in MANAGED.items():
        want = fn(product, tier)
        got = env.get(key, (None, None))[1]
        if got is None:
            problems.append((path, key, "unset", want))
            print(f"  {RED}MISSING{RESET} {label}: {key} unset, want {want}")
        elif got != want:
            problems.append((path, key, got, want))
            print(f"  {RED}DRIFT  {RESET} {label}: {key}={got}, want {want}")
        else:
            print(f"  {GREEN}ok     {RESET} {label}: {key}={got}")


def check_compose(root, product, problems):
    """Assert each compose file publishes exactly the registry's host ports."""
    # growth-tools predates the template and keeps its dev compose at the repo
    # root as docker-compose.yml, so the dev tier has two possible filenames.
    tiers = (("dev", ("docker-compose.services.yml", "docker-compose.yml")),
             ("test", ("docker-compose.test.yml",)))
    for tier, fnames in tiers:
        cands = [os.path.join(d, f) for f in fnames for d in (os.path.join(root, "base-server"), root)]
        for cand in cands:
            if not os.path.isfile(cand):
                continue
            fname = os.path.basename(cand)
            txt = open(cand).read()
            for kind, container in (("db", 5432), ("kafka", 9092)):
                want = product["infra_ports"][f"{kind}_{tier}"]
                published = re.findall(r'"(\d{2,5}):%d"' % container, txt)
                if not published:
                    continue
                if str(want) not in published:
                    problems.append((cand, kind, ",".join(published), str(want)))
                    print(f"  {RED}DRIFT  {RESET} {fname}: {kind} publishes {published}, want {want}")
                else:
                    print(f"  {GREEN}ok     {RESET} {fname}: {kind} -> {want}")
            break


def apply_env_local(path, product):
    """Rewrite managed keys in env.local, preserving everything else."""
    if not os.path.isfile(path):
        print(f"{RED}env.local not found at {path}{RESET} — copy env.local.example first.")
        return False
    lines = open(path).read().split("\n")
    seen, changed = set(), []
    for i, line in enumerate(lines):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
        if not m or m.group(1) not in MANAGED:
            continue
        key = m.group(1)
        seen.add(key)
        want = MANAGED[key](product, "local")
        if m.group(2).strip() != want:
            lines[i] = f"{key}={want}"
            changed.append(f"{key}: {m.group(2).strip() or '(empty)'} -> {want}")
    # Insert any managed key the file never had (meerkat's env.local had no
    # DB_PORT and no PRODUCT_NAME). DB_* keys go with the rest of the DB block;
    # anything else is appended under a header so its provenance is obvious.
    missing = [k for k in MANAGED if k not in seen]
    for key in [k for k in missing if k.startswith("DB_")]:
        want = MANAGED[key](product, "local")
        last_db = max((i for i, l in enumerate(lines) if re.match(r"^DB_[A-Z_]+=", l)), default=len(lines) - 1)
        lines.insert(last_db + 1, f"{key}={want}")
        changed.append(f"{key}: (absent) -> {want}")
    tail = [k for k in missing if not k.startswith("DB_")]
    if tail:
        while lines and not lines[-1].strip():
            lines.pop()
        lines.append("")
        lines.append("# Added by sync-dev-ports.py — see SAVentures/env-registry")
        for key in tail:
            want = MANAGED[key](product, "local")
            lines.append(f"{key}={want}")
            changed.append(f"{key}: (absent) -> {want}")
        lines.append("")
    if not changed:
        print(f"{GREEN}env.local already matches the registry.{RESET}")
        return True
    open(path, "w").write("\n".join(lines))
    print(f"{GREEN}Updated env.local:{RESET}")
    for c in changed:
        print(f"  {c}")
    return True


def main():
    ap = argparse.ArgumentParser(description="Sync local dev ports and product name against the shared registry.")
    ap.add_argument("--registry", default=None,
                    help="path or URL to registry.json (default: $ENV_REGISTRY, "
                         "then a sibling checkout, then gh api)")
    ap.add_argument("--print-sha", action="store_true",
                    help="print this script's sha256 for registry.json and exit")
    ap.add_argument("--apply", action="store_true", help="rewrite env.local (default is check-only)")
    ap.add_argument("--product", help="override product lookup (defaults to the checkout directory name)")
    args = ap.parse_args()

    if args.print_sha:
        print(script_sha256())
        return 0

    root = repo_root()
    if not root:
        print(f"{RED}Could not locate the repo root (no base-server/ above this script).{RESET}")
        return 2

    try:
        source, text = resolve_registry(args.registry, root=root)
        reg = json.loads(text)
    except Exception as e:
        print(f"{RED}{e}{RESET}")
        return 2
    check_script_freshness(reg)

    product = find_product(reg, root, args.product)
    if not product:
        print(f"{RED}No registry entry for '{args.product or os.path.basename(root)}'.{RESET}")
        print(f"Known: {', '.join(p['checkout_dir'] for p in reg['products'])}")
        print("Claim a slot in SAVentures/env-registry, or pass --product.")
        return 2

    print(f"{product['product_name']} (slot {product['slot']}) — {root}")
    print(f"{DIM}registry: {source}{RESET}\n")

    problems = []
    check_compose(root, product, problems)
    check_env(os.path.join(root, "base-server", "env.test"), product, "test", problems, "env.test")
    check_env(os.path.join(root, "base-server", "env.local.example"), product, "local", problems, "env.local.example")

    env_local = os.path.join(root, "base-server", "env.local")
    if args.apply:
        print()
        apply_env_local(env_local, product)
    else:
        check_env(env_local, product, "local", problems, "env.local")

    # App ports are recorded, not allocated — report, never fail. See registry.
    if not reg.get("app_ports_status", {}).get("allocated", False):
        shared = {}
        for p in reg["products"]:
            for k, v in (p.get("app_ports") or {}).items():
                if v:
                    shared.setdefault((k, v), []).append(p["product_name"])
        clashes = {k: v for k, v in shared.items() if len(v) > 1 and product["product_name"] in v}
        if clashes:
            print(f"\n{YELLOW}App ports are not yet allocated (informational, not a failure):{RESET}")
            for (kind, port), who in sorted(clashes.items()):
                print(f"  {kind} {port} shared with: {', '.join(n for n in who if n != product['product_name'])}")

    if problems and not args.apply:
        print(f"\n{RED}{len(problems)} mismatch(es).{RESET} Run with --apply to fix env.local; "
              "committed files need a reviewed commit.")
        return 1
    if not args.apply:
        print(f"\n{GREEN}In sync with the registry.{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
