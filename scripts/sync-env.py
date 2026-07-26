#!/usr/bin/env python3
"""Sync a product repo's env.local against the shared catalog and value store.

Copy this file into a product repo as scripts/sync-env.py, alongside
sync-env-selftest. It locates the registry, works out which product it is from
the git remote, then:

  --check   (default) verify env.local and env.test against the catalog.
            Exit 1 on any mismatch. Safe to run in CI.
  --apply   rewrite env.local in place. env.local is gitignored, so it is the
            one file a PR can never fix for you — hence the only file this
            writes by default. Committed files are reported, never edited.
  --write-example
            regenerate env.local.example with secret values redacted. That file
            is generated, not hand-maintained, so it cannot drift.

Values are SOPS-encrypted and need the age key. Without it this runs in
SHAPE-ONLY mode: names, surfaces and product membership are checked, values are
not. CI runs in that mode by design — it has no key and should not have one.

Which value wins on the local surface:
    values/shared.enc.env  <  values/<product>.enc.env
                           <  values/shared.local.enc.env
                           <  values/<product>.local.enc.env
The base files hold the AWS value; the .local files override it where local and
deployed genuinely differ (sandbox Stripe vs live, dev JWT secret vs prod, ...).

Standard library only, by design: these repos forbid adding pyyaml to tooling,
which is also why the registry is JSON. `sops` is invoked as a subprocess.

The registry repo is private, so an anonymous HTTP fetch is not an option. It is
located in this order, and discovery is by marker file rather than by directory
name so that renaming the registry again costs nothing:

  1. --registry <path|url>
  2. $ENV_REGISTRY  ($DEV_PORTS_REGISTRY still works, with a warning)
  3. a sibling checkout holding a registry.json with a schema_version
  4. gh api against SAVentures/env-registry, then SAVentures/dev-ports
  5. failure, naming all three fixes

  python3 scripts/sync-env.py                    # check
  python3 scripts/sync-env.py --apply            # fix env.local
  python3 scripts/sync-env.py --write-example    # regenerate the example
  ./scripts/sync-env-selftest                    # verify the script itself
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
REDACTED = "<set-this>"

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"
if not sys.stdout.isatty() or os.environ.get("NO_COLOR"):
    GREEN = RED = YELLOW = DIM = RESET = ""


# --- locating the registry (behaviour unchanged from sync-dev-ports.py) ------

def _read_source(src):
    """Read a file from a filesystem path or an http(s) URL."""
    if re.match(r"^https?://", src):
        with urllib.request.urlopen(src, timeout=15) as r:
            return r.read().decode()
    with open(src) as f:
        return f.read()


def find_sibling_registry(root):
    """Locate a sibling checkout holding registry.json, by marker not by name."""
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
    """Find registry.json. Returns (label, text); raises RuntimeError if unfound."""
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


def resolve_catalog(source, runner=None):
    """Read catalog.json from wherever registry.json came from."""
    if source.startswith("gh:"):
        text = gh_raw(source[3:], "catalog.json", runner=runner)
        if text is None:
            raise RuntimeError("found registry.json via %s but not catalog.json" % source)
        return json.loads(text)
    if re.match(r"^https?://", source):
        return json.loads(_read_source(re.sub(r"registry\.json$", "catalog.json", source)))
    here = os.path.dirname(os.path.abspath(source))
    return json.loads(_read_source(os.path.join(here, "catalog.json")))


def script_sha256():
    with open(os.path.abspath(__file__), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def check_script_freshness(reg):
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
    worktree's name, not the repo's, and these repos use worktrees heavily.
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


# --- values ------------------------------------------------------------------

def decrypt(values_dir, filename):
    """Return {KEY: value} from a SOPS-encrypted dotenv file.

    Returns None (not {}) when the file exists but cannot be decrypted, so the
    caller can tell "no such file" from "no age key" and fall back to
    shape-only mode rather than silently reporting everything as missing.
    """
    path = os.path.join(values_dir, filename)
    if not os.path.isfile(path):
        return {}
    try:
        p = subprocess.run(["sops", "--decrypt", path],
                           capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    if p.returncode != 0:
        return None
    out = {}
    for line in p.stdout.split("\n"):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
        if m and not m.group(1).startswith("SOPS_"):
            out[m.group(1)] = m.group(2)
    return out


def load_values(values_dir, product, surface):
    """Layer the value files for a surface. None means shape-only mode."""
    layers = ["shared.enc.env", "%s.enc.env" % product]
    if surface == "local":
        layers += ["shared.local.enc.env", "%s.local.enc.env" % product]
    merged = {}
    for f in layers:
        got = decrypt(values_dir, f)
        if got is None:
            return None
        merged.update(got)
    return merged


def interpolate(template, product_entry):
    """Resolve {product} and {ports.*} against the registry entry."""
    out = template.replace("{product}", product_entry["product_name"])

    def port(m):
        return str(product_entry["infra_ports"][m.group(1)])

    return re.sub(r"\{ports\.([a-z_]+)\}", port, out)


def applicable(spec, product):
    """Does this product get this var at all?"""
    if spec.get("scope") == "derived":
        return True
    products = spec.get("products")
    return products == "*" or product in (products or [])


def resolve(catalog, product_entry, values, surface):
    """Return ({NAME: value}, missing). values=None yields names with value None."""
    product = product_entry["product_name"]
    out, missing = {}, []
    for name, spec in sorted(catalog["vars"].items()):
        if surface not in spec.get("surfaces", []):
            continue
        if not applicable(spec, product):
            continue
        if spec.get("scope") == "derived":
            out[name] = interpolate(str(spec["value"][surface]), product_entry)
            continue
        if values is None:
            out[name] = None
            continue
        val = values.get(name)
        if val is None:
            if spec.get("required", True) and not spec.get("omit_if_empty"):
                missing.append(name)
            continue
        out[name] = val
    return out, missing


# --- env files ---------------------------------------------------------------

def read_env(path):
    """Return {key: (lineno, value)} for simple KEY=VALUE lines."""
    if not os.path.isfile(path):
        return None
    out = {}
    for i, line in enumerate(open(path, errors="replace").read().split("\n")):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
        if m:
            out[m.group(1)] = (i, m.group(2).strip())
    return out


def catalog_keys(catalog, product_entry, surface):
    """Every var the catalog grants this product on a surface, value or not."""
    product = product_entry["product_name"]
    return {n for n, s in catalog["vars"].items()
            if surface in s.get("surfaces", []) and applicable(s, product)}


def build_renamed_map(catalog):
    """old_name -> new_name, from every var's renamed_from.

    Lets a stale env.local be reported and fixed under its new name rather
    than as simultaneously MISSING (the new name) and EXTRA (the old one).
    """
    out = {}
    for new_name, spec in catalog.get("vars", {}).items():
        old_name = spec.get("renamed_from")
        if old_name and old_name != new_name:
            out[old_name] = new_name
    return out


def check_file(path, label, want, known, shape_only, problems, renamed):
    env = read_env(path)
    if env is None:
        print("  %s%s: absent%s" % (DIM, label, RESET))
        return
    new_to_old = {}
    for old, new in renamed.items():
        new_to_old.setdefault(new, old)
    stale = set()
    for key in sorted(want):
        if key not in env:
            old = new_to_old.get(key)
            if old and old in env:
                problems.append((label, key, "stale-name"))
                print("  %sRENAMED%s %s: %s is now %s" % (YELLOW, RESET, label, old, key))
                stale.add(old)
                continue
            problems.append((label, key, "unset"))
            print("  %sMISSING%s %s: %s" % (RED, RESET, label, key))
        elif not shape_only and want[key] is not None and env[key][1] != want[key]:
            problems.append((label, key, "drift"))
            print("  %sDRIFT  %s %s: %s" % (RED, RESET, label, key))
    # `known` is every var the catalog grants this product, including ones with
    # no stored value. Without it, a var reported as NO VALUE would be reported
    # a second time as EXTRA, which reads as two unrelated problems. `stale` is
    # excluded for the same reason: it was already reported once, as RENAMED.
    for key in sorted(set(env) - known - stale):
        print("  %sEXTRA  %s %s: %s is not in the catalog for this product"
              % (YELLOW, RESET, label, key))


def apply_env_local(path, want, renamed):
    """Rewrite catalog-managed keys, preserving comments and unmanaged lines."""
    if os.path.isfile(path):
        lines = open(path, errors="replace").read().split("\n")
    else:
        lines = ["# Generated by sync-env.py — see SAVentures/env-registry", ""]
    seen, changed = set(), []
    for i, line in enumerate(lines):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line)
        if not m:
            continue
        key = m.group(1)
        new_key = renamed.get(key)
        if new_key and new_key in want and new_key not in seen:
            # Rename in place, keeping the value the local file already has —
            # local secrets often deliberately differ from the catalog value.
            lines[i] = "%s=%s" % (new_key, m.group(2))
            seen.add(new_key)
            changed.append("%s -> %s" % (key, new_key))
            continue
        if key not in want:
            continue
        seen.add(key)
        if want[key] is not None and m.group(2).strip() != want[key]:
            lines[i] = "%s=%s" % (key, want[key])
            changed.append(key)
    tail = [k for k in sorted(want) if k not in seen and want[k] is not None]
    if tail:
        while lines and not lines[-1].strip():
            lines.pop()
        lines += ["", "# Added by sync-env.py — see SAVentures/env-registry"]
        for key in tail:
            lines.append("%s=%s" % (key, want[key]))
            changed.append(key)
        lines.append("")
    if not changed:
        print("%senv.local already matches the catalog.%s" % (GREEN, RESET))
        return
    open(path, "w").write("\n".join(lines))
    print("%sUpdated env.local (%d keys):%s %s"
          % (GREEN, len(changed), RESET, ", ".join(sorted(changed))))


def render_example(catalog, want):
    """env.local.example: real values for non-secrets, a placeholder for secrets."""
    lines = ["# Generated by sync-env.py --write-example — do not edit by hand.",
             "# Add or change a variable in SAVentures/env-registry, then re-run.",
             "#",
             "# Secret values are redacted here. Run `python3 scripts/sync-env.py --apply`",
             "# to write a real env.local from the encrypted store.",
             ""]
    for name in sorted(want):
        spec = catalog["vars"][name]
        val = REDACTED if spec.get("secret") else (want[name] or "")
        if not spec.get("required", True) and not spec.get("secret") and not val:
            lines.append("# %s=" % name)
        else:
            lines.append("%s=%s" % (name, val))
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser(description="Sync env.local against the shared catalog.")
    ap.add_argument("--registry", default=None,
                    help="path or URL to registry.json (default: $ENV_REGISTRY, "
                         "then a sibling checkout, then gh api)")
    ap.add_argument("--print-sha", action="store_true",
                    help="print this script's sha256 for registry.json and exit")
    ap.add_argument("--apply", action="store_true", help="rewrite env.local")
    ap.add_argument("--write-example", action="store_true",
                    help="regenerate base-server/env.local.example")
    ap.add_argument("--stdout", action="store_true",
                    help="with --write-example, print instead of writing")
    ap.add_argument("--product", help="override product lookup")
    args = ap.parse_args()

    if args.print_sha:
        print(script_sha256())
        return 0

    root = repo_root()
    if not root:
        print("%sCould not locate the repo root (no base-server/ above this script).%s"
              % (RED, RESET))
        return 2

    try:
        source, text = resolve_registry(args.registry, root=root)
        reg = json.loads(text)
        catalog = resolve_catalog(source)
    except Exception as e:
        print("%s%s%s" % (RED, e, RESET))
        return 2
    check_script_freshness(reg)

    product = find_product(reg, root, args.product)
    if not product:
        print("%sNo registry entry for '%s'.%s"
              % (RED, args.product or os.path.basename(root), RESET))
        print("Known: %s" % ", ".join(p["checkout_dir"] for p in reg["products"]))
        return 2

    values_dir = os.path.join(os.path.dirname(os.path.abspath(source)), "values")
    values = load_values(values_dir, product["product_name"], "local") \
        if os.path.isdir(values_dir) else None
    shape_only = values is None

    print("%s (slot %s) — %s" % (product["product_name"], product["slot"], root))
    print("%sregistry: %s%s" % (DIM, source, RESET))
    if shape_only:
        print("%sshape-only mode: no age key, values are not compared%s" % (YELLOW, RESET))
    print()

    want, missing = resolve(catalog, product, values, "local")
    for m in missing:
        print("  %sNO VALUE%s %s is required but absent from the value store"
              % (RED, RESET, m))

    base = os.path.join(root, "base-server")
    if args.write_example:
        out = render_example(catalog, want)
        if args.stdout:
            sys.stdout.write(out)
        else:
            open(os.path.join(base, "env.local.example"), "w").write(out)
            print("%sWrote base-server/env.local.example (%d vars)%s"
                  % (GREEN, len(want), RESET))
        return 0

    renamed = build_renamed_map(catalog)

    if args.apply:
        apply_env_local(os.path.join(base, "env.local"), want, renamed)
        return 0

    problems = []
    known_local = catalog_keys(catalog, product, "local")
    check_file(os.path.join(base, "env.local"), "env.local", want, known_local,
               shape_only, problems, renamed)
    # env.test holds deliberately different values (test database, placeholder
    # keys), so only its variable NAMES are checked against the catalog.
    want_test, _ = resolve(catalog, product, values, "test")
    known_test = catalog_keys(catalog, product, "test")
    check_file(os.path.join(base, "env.test"), "env.test", want_test, known_test,
               True, problems, renamed)

    if problems or missing:
        print("\n%s%d mismatch(es).%s Run with --apply to fix env.local."
              % (RED, len(problems) + len(missing), RESET))
        return 1
    print("\n%sIn sync with the catalog.%s" % (GREEN, RESET))
    return 0


if __name__ == "__main__":
    sys.exit(main())
