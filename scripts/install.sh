#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/python.sh"
cd "$CHECKWISE_ROOT"
checkwise_system_python
checkwise_node
"${CHECKWISE_SYSTEM_PYTHON[@]}" -m venv .venv
checkwise_venv_python
"$CHECKWISE_PYTHON" -m pip install --require-hashes -r backend/requirements.lock
export DEBUG=true
"$CHECKWISE_PYTHON" backend/manage.py migrate --noinput
"$CHECKWISE_PYTHON" backend/manage.py seed
cd frontend
npm ci --no-fund
npm run build
