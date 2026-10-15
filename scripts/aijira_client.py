"""HTTP client for Aijira's public and agent APIs, shared by `scripts/tickets`, `scripts/plan-assemble`,
`scripts/plan-lint` and `scripts/aijira-cutover`.

Python 3 stdlib only. Load it with `importlib.machinery.SourceFileLoader`, as `scripts/tickets` does.
"""

# Stock macOS ships Python 3.9 (`/usr/bin/python3`); deferring annotations keeps it importable there.
from __future__ import annotations

import json
import os
import re
import socket
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent

DEFAULT_URL = "https://aijira.protoapp.xyz"
TIMEOUT_SECONDS = 15
AGENT_HEADER = "X-Aijira-Agent"
SESSION_HEADER = "X-Aijira-Session"
SESSION_ENV = "CLAUDE_SESSION_URL"
SESSION_URL_MAX = 500
AGENT_NAME_MAX = 200
USER_AGENT = "aijira-tickets/1"

_REPO_LOOKUPS = {}
_PRODUCT_INFO = {}
_SESSION_NOTED = []


class UsageError(Exception):
    """A malformed invocation, or a server 400. Exit 1."""


class ApiError(Exception):
    def __init__(self, code, message, api_code="", details=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.api_code = api_code
        self.details = details


def base_url():
    return (os.environ.get("AIJIRA_URL") or DEFAULT_URL).strip().rstrip("/")


def git_output(*args):
    try:
        proc = subprocess.run(
            ["git", *args], capture_output=True, text=True, timeout=10, cwd=os.getcwd()
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if proc.returncode != 0:
        return None
    return proc.stdout.strip() or None


def git_toplevel():
    top = git_output("rev-parse", "--show-toplevel")
    return Path(top) if top else HERE.parent


def agent_name():
    for var in ("AIJIRA_AGENT", "CLAUDE_CODE_SESSION_ID"):
        value = (os.environ.get(var) or "").strip()
        if value:
            return value[:AGENT_NAME_MAX]
    host = socket.gethostname() or "unknown-host"
    return f"{host}:{git_toplevel().name}"[:AGENT_NAME_MAX]


def session_url():
    """The session URL to send, or None. A set-but-unusable value is noted once on stderr."""
    value = (os.environ.get(SESSION_ENV) or "").strip()
    if not value:
        return None
    if value.startswith("https://") and len(value) <= SESSION_URL_MAX:
        return value
    if not _SESSION_NOTED:
        _SESSION_NOTED.append(True)
        print(
            f"note: {SESSION_ENV} is not an https:// URL of at most {SESSION_URL_MAX} characters; "
            f"{SESSION_HEADER} not sent",
            file=sys.stderr,
        )
    return None


def request(method, path, body=None, agent=False, text=False):
    """(status, parsed JSON, or the decoded body when `text`). Raises ApiError for every non-2xx and
    every transport failure."""
    url = base_url() + path
    headers = {"Accept": "text/markdown" if text else "application/json", "User-Agent": USER_AGENT}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if agent:
        headers[AGENT_HEADER] = agent_name()
        session = session_url()
        if session:
            headers[SESSION_HEADER] = session
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            status, raw = resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        status, raw = exc.code, exc.read()
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise ApiError(
            5, f"Aijira unreachable at {url} ({getattr(exc, 'reason', exc)}); nothing was allocated or written"
        ) from exc

    if text and 200 <= status < 300:
        try:
            return status, raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ApiError(8, f"{method} {url}: {status} with an undecodable body") from exc
    parsed = None
    if raw:
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            parsed = None
    if 200 <= status < 300:
        if status != 204 and parsed is None:
            raise ApiError(8, f"{method} {url}: {status} with an unparsable body")
        return status, parsed
    raise error_for(status, parsed, method, url)


def error_for(status, parsed, method, url):
    code = ""
    message = ""
    details = None
    if isinstance(parsed, dict):
        code = str(parsed.get("code") or "")
        message = str(parsed.get("error") or parsed.get("message") or "")
        details = parsed.get("details") if isinstance(parsed.get("details"), dict) else None
    if status >= 500 or (parsed is None and status != 404):
        return ApiError(8, message or f"{method} {url}: server error {status}", code, details)
    message = message or f"{method} {url}: HTTP {status}"
    if status == 403 or (status == 400 and code == "AGENT_NAME_REQUIRED"):
        return ApiError(6, message, code, details)
    if status == 400:
        return ApiError(1, message, code, details)
    if status == 404:
        return ApiError(3, message, code, details)
    if status == 409:
        return ApiError(7, message, code, details)
    return ApiError(8, message, code, details)


def normalize_remote(url):
    """https or ssh remote -> lower-case `owner/name`, or None."""
    text = (url or "").strip()
    if text.endswith("/"):
        text = text[:-1]
    if text.endswith(".git"):
        text = text[: -len(".git")]
    parts = [p for p in re.split(r"[/:]", text) if p]
    if len(parts) < 2:
        return None
    return f"{parts[-2]}/{parts[-1]}".lower()


def _repo_lookup(owner, name):
    """Cached per process, so the mode probe and the verb share one repo lookup."""
    key = (owner, name)
    if key not in _REPO_LOOKUPS:
        _, found = request("GET", f"/api/public/repos/{urllib.parse.quote(owner)}/{urllib.parse.quote(name)}")
        _REPO_LOOKUPS[key] = found
    return _REPO_LOOKUPS[key]


def discover_product():
    product = (os.environ.get("AIJIRA_PRODUCT") or "").strip()
    if product:
        return product
    remote = git_output("remote", "get-url", "origin")
    slug = normalize_remote(remote) if remote else None
    if not slug:
        raise UsageError(
            "cannot tell which product this is: no AIJIRA_PRODUCT and no git remote `origin`. "
            "Set AIJIRA_PRODUCT"
        )
    owner, name = slug.split("/", 1)
    try:
        found = _repo_lookup(owner, name)
    except ApiError as exc:
        if exc.code == 3:
            raise ApiError(3, f"repo {slug} is not registered with Aijira ({exc.message})") from exc
        raise
    product = str((found or {}).get("product") or "").strip() if isinstance(found, dict) else ""
    if not product:
        raise ApiError(8, f"GET /api/public/repos/{slug}: response has no product")
    return product


def product_info():
    """{product, code, items_mode} for the discovered product, cached per process."""
    if _PRODUCT_INFO:
        return dict(_PRODUCT_INFO)
    product = discover_product()
    entry = None
    if (os.environ.get("AIJIRA_PRODUCT") or "").strip():
        _, listed = request("GET", "/api/public/products")
        if not isinstance(listed, list):
            raise ApiError(8, "GET /api/public/products: response is not a list")
        entry = next((p for p in listed if isinstance(p, dict) and p.get("slug") == product), None)
        if entry is None:
            raise ApiError(3, f"product {product!r} is not registered with Aijira")
    else:
        entry = next((v for v in _REPO_LOOKUPS.values() if isinstance(v, dict)), None) or {}
    _PRODUCT_INFO.update(
        product=product, code=str(entry.get("code") or ""), items_mode=entry.get("items_mode") is True
    )
    return dict(_PRODUCT_INFO)
