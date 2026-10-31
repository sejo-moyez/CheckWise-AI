#!/usr/bin/env bash
# Shared by Git Bash on Windows and POSIX shells. Callers enable strict mode.
CHECKWISE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

checkwise_system_python() {
  local command_name
  # The Windows installer supplies the py launcher, often without python3.
  if command -v py >/dev/null 2>&1 && py -3.12 -c 'import sys; sys.exit(sys.version_info[:2] != (3, 12))' >/dev/null 2>&1; then
    CHECKWISE_SYSTEM_PYTHON=(py -3.12)
    return 0
  fi
  for command_name in python3.12 python3 python; do
    if command -v "$command_name" >/dev/null 2>&1 && "$command_name" -c 'import sys; sys.exit(sys.version_info[:2] != (3, 12))' >/dev/null 2>&1; then
      CHECKWISE_SYSTEM_PYTHON=("$command_name")
      return 0
    fi
  done
  echo 'Python 3.12 was not found. Install it from https://www.python.org/downloads/ (enable the Python launcher on Windows), then reopen your terminal.' >&2
  return 1
}

checkwise_venv_python() {
  local root="${1:-$CHECKWISE_ROOT}" candidate
  for candidate in "$root/.venv/Scripts/python.exe" "$root/.venv/bin/python"; do
    if [ -x "$candidate" ] && "$candidate" -c 'import sys; sys.exit(sys.version_info[:2] != (3, 12))' >/dev/null 2>&1; then
      CHECKWISE_PYTHON="$candidate"
      return 0
    fi
  done
  echo 'A working Python 3.12 virtual environment was not found. Run bash scripts/install.sh first.' >&2
  return 1
}

checkwise_node() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo 'Node.js and npm were not found. Install Node.js 24 from https://nodejs.org/, then reopen your terminal.' >&2
    return 1
  fi
  if ! node -e 'const [major,minor]=process.versions.node.split(".").map(Number); process.exit((major===22 && minor>=12) || major===24 || major>=26 ? 0 : 1)' >/dev/null 2>&1; then
    echo 'Use Node.js 22.12+, 24, or a newer supported LTS release.' >&2
    return 1
  fi
}
