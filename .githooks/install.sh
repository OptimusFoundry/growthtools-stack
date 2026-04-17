#!/usr/bin/env bash
# Point this clone's Git hooks at the in-repo .githooks/ directory so the
# commit-msg validator runs for every commit you make here.
#
# Run once per clone:
#   ./.githooks/install.sh
#
# Under the hood this just sets core.hooksPath; you can undo with:
#   git config --unset core.hooksPath

set -e
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
echo "✓ core.hooksPath set to .githooks for this clone."
echo "  Hooks that will run:"
ls -1 .githooks | grep -v -E '\.(sh|md)$' | sed 's/^/    /'
