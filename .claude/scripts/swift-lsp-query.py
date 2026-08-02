#!/usr/bin/env python3
"""
swift-lsp-query.py — drive sourcekit-lsp directly over stdio JSON-RPC.

WHY THIS EXISTS: Claude Code's built-in `LSP` tool talks to a single,
long-lived sourcekit-lsp process shared across the whole session, rooted at
whatever directory it first initialized in. For this repo that process's
cross-file operations (goToDefinition / findReferences / workspaceSymbol, and
hover on any symbol not declared in the current file) reliably return empty —
confirmed on 2026-08-01 in both the main checkout and a freshly-warmed
worktree, despite a correct buildServer.json and a populated IndexStore
(1614+ units). A standalone sourcekit-lsp process, given the same root, the
same buildServer.json, and the same file, resolves all of the above
correctly. So the index/build/xcode-build-server chain is NOT the problem —
the shared long-lived process the built-in tool drives is. This script spins
up its own short-lived sourcekit-lsp process per invocation (mirroring the
standalone probe that confirmed cross-file resolution works) as a working
substitute until the built-in tool is fixed.

Usage:
  swift-lsp-query.py <operation> <file> <line> <character> [--root ROOT] [--query STR] [--timeout SEC]

  operation:  hover | definition | references | documentSymbol | workspaceSymbol
  file:       absolute or repo-relative path to the Swift file
  line:       1-based line number (as shown in editors)
  character:  1-based character offset (as shown in editors)
  --root:     workspace root containing buildServer.json (default: walk up
              from <file> to the nearest ancestor with a buildServer.json,
              falling back to the git top-level)
  --query:    symbol name, required for workspaceSymbol (line/character are
              ignored for this operation but still required positionally —
              pass 1 1)
  --timeout:  seconds to wait for sourcekit-lsp to respond (default: 20)

Output: a single JSON object on stdout — either the raw LSP result or
{"error": "..."} on failure/timeout. Exit code 0 on a well-formed response
(even if the result is empty/null), 1 on transport/protocol failure.
"""
import argparse
import json
import os
import subprocess
import sys
import threading
import time

OPERATIONS = {
    "hover": "textDocument/hover",
    "definition": "textDocument/definition",
    "references": "textDocument/references",
    "documentSymbol": "textDocument/documentSymbol",
    "workspaceSymbol": "workspace/symbol",
}


def find_sourcekit_lsp():
    try:
        out = subprocess.run(["xcrun", "--find", "sourcekit-lsp"], capture_output=True, text=True, timeout=10)
        path = out.stdout.strip()
        if out.returncode == 0 and path:
            return path
    except Exception:
        pass
    return "/usr/bin/sourcekit-lsp"


def find_root(file_path):
    d = os.path.dirname(os.path.abspath(file_path))
    while d != "/":
        if os.path.exists(os.path.join(d, "buildServer.json")):
            return d
        d = os.path.dirname(d)
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=os.path.dirname(os.path.abspath(file_path)),
                              capture_output=True, text=True, timeout=10)
        if out.returncode == 0:
            return out.stdout.strip()
    except Exception:
        pass
    return os.path.dirname(os.path.abspath(file_path))


class LSPClient:
    def __init__(self, binary, root, timeout):
        self.proc = subprocess.Popen([binary], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE, cwd=root)
        self.timeout = timeout
        self._stderr_lines = []
        threading.Thread(target=self._drain_stderr, daemon=True).start()

    def _drain_stderr(self):
        for line in self.proc.stderr:
            self._stderr_lines.append(line.decode(errors="replace"))

    def send(self, msg):
        body = json.dumps(msg).encode()
        header = f"Content-Length: {len(body)}\r\n\r\n".encode()
        self.proc.stdin.write(header + body)
        self.proc.stdin.flush()

    def _read_one(self):
        headers = {}
        while True:
            line = self.proc.stdout.readline()
            if not line:
                raise EOFError("sourcekit-lsp closed stdout" + ("; stderr: " + "".join(self._stderr_lines[-20:]) if self._stderr_lines else ""))
            if line in (b"\r\n", b"\n"):
                break
            if b":" in line:
                k, v = line.decode().split(":", 1)
                headers[k.strip()] = v.strip()
        length = int(headers.get("Content-Length", "0"))
        body = self.proc.stdout.read(length)
        return json.loads(body)

    def read_response_for(self, req_id):
        # Skip server->client notifications (e.g. publishDiagnostics) until the
        # matching response id shows up.
        while True:
            msg = self._read_one()
            if msg.get("id") == req_id and "method" not in msg:
                return msg

    def shutdown(self):
        try:
            self.send({"jsonrpc": "2.0", "id": "shutdown", "method": "shutdown", "params": None})
            self.read_response_for("shutdown")
            self.send({"jsonrpc": "2.0", "method": "exit", "params": None})
        except Exception:
            pass
        try:
            self.proc.wait(timeout=5)
        except Exception:
            self.proc.kill()


def run(operation, file_path, line, character, root, query, timeout):
    file_path = os.path.abspath(file_path)
    if not os.path.isfile(file_path):
        return {"error": f"file not found: {file_path}"}
    with open(file_path) as f:
        text = f.read()

    binary = find_sourcekit_lsp()
    client = LSPClient(binary, root, timeout)

    def with_timeout(fn):
        result = {}

        def target():
            try:
                result["value"] = fn()
            except Exception as e:
                result["error"] = str(e)
        t = threading.Thread(target=target, daemon=True)
        t.start()
        t.join(timeout)
        if t.is_alive():
            return {"error": f"sourcekit-lsp did not respond within {timeout}s"}
        if "error" in result:
            return {"error": result["error"]}
        return result.get("value")

    def do():
        client.send({
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {
                "processId": None,
                "rootUri": "file://" + root,
                "capabilities": {},
                "workspaceFolders": [{"uri": "file://" + root, "name": os.path.basename(root)}],
            },
        })
        client.read_response_for(1)
        client.send({"jsonrpc": "2.0", "method": "initialized", "params": {}})
        client.send({
            "jsonrpc": "2.0", "method": "textDocument/didOpen",
            "params": {"textDocument": {"uri": "file://" + file_path, "languageId": "swift", "version": 1, "text": text}},
        })
        # sourcekit-lsp needs a brief settle window after didOpen before
        # cross-file (index-backed) queries on a just-opened file return
        # results — without this, hover/definition/references on anything
        # not declared in the opened file itself come back empty even though
        # the index is fully populated. Same-file hover doesn't need this
        # (pure syntax, no index lookup) but we pay the cost uniformly since
        # a false-empty is worse than one extra second.
        time.sleep(2)

        if operation == "workspaceSymbol":
            client.send({"jsonrpc": "2.0", "id": 2, "method": "workspace/symbol", "params": {"query": query or ""}})
            return client.read_response_for(2)

        params = {"textDocument": {"uri": "file://" + file_path}, "position": {"line": line - 1, "character": character - 1}}
        if operation == "references":
            params["context"] = {"includeDeclaration": True}
        method = OPERATIONS[operation]
        client.send({"jsonrpc": "2.0", "id": 2, "method": method, "params": params})
        return client.read_response_for(2)

    resp = with_timeout(do)
    client.shutdown()
    if isinstance(resp, dict) and "error" in resp and "result" not in resp and "value" not in resp and set(resp.keys()) == {"error"}:
        return resp
    if isinstance(resp, dict) and "result" in resp:
        return resp["result"]
    return resp


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("operation", choices=list(OPERATIONS.keys()))
    p.add_argument("file")
    p.add_argument("line", type=int)
    p.add_argument("character", type=int)
    p.add_argument("--root", default=None)
    p.add_argument("--query", default=None)
    p.add_argument("--timeout", type=float, default=20)
    args = p.parse_args()

    if args.operation == "workspaceSymbol" and not args.query:
        print(json.dumps({"error": "workspaceSymbol requires --query"}))
        sys.exit(1)

    root = args.root or find_root(args.file)
    result = run(args.operation, args.file, args.line, args.character, root, args.query, args.timeout)
    print(json.dumps(result, indent=2))
    sys.exit(0 if not (isinstance(result, dict) and set(result.keys()) == {"error"}) else 1)


if __name__ == "__main__":
    main()
