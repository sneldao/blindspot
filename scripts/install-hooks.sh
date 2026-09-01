#!/usr/bin/env bash
# install-hooks.sh — symlink version-controlled git hooks into .git/hooks/
#
# Run once after cloning:
#   bash scripts/install-hooks.sh
#
# Re-run if hooks are updated. Safe to run multiple times.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hooks_dir="$repo_root/hooks"
git_hooks_dir="$repo_root/.git/hooks"

echo "Installing git hooks from $hooks_dir → $git_hooks_dir"

for hook in pre-commit pre-push; do
  src="$hooks_dir/$hook"
  dst="$git_hooks_dir/$hook"

  if [ ! -f "$src" ]; then
    echo "  skip: $hook (source not found)"
    continue
  fi

  # Remove existing hook (sample or real)
  rm -f "$dst"

  # Symlink so updates to the repo's hooks/ dir take effect immediately
  ln -s "$src" "$dst"
  chmod +x "$src"

  echo "  installed: $hook → $src"
done

echo ""
echo "Done. Hooks will run on:"
echo "  pre-commit: secrets scan (gitleaks) + Python lint (ruff) + TypeScript check (tsc)"
echo "  pre-push:   full secrets scan on pushed commits (gitleaks)"
echo ""
echo "Requires: gitleaks, ruff (both optional — hooks warn if missing)"
echo "  brew install gitleaks ruff"
