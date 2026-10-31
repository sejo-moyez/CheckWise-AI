#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/python.sh"
cd "$CHECKWISE_ROOT"
checkwise_venv_python
checkwise_node
export DEBUG=true
export PAYMENT_PROVIDER=mock DETECTION_PROVIDER=mock REWRITE_PROVIDER=mock CELERY_TASK_ALWAYS_EAGER=true
"$CHECKWISE_PYTHON" backend/manage.py migrate --noinput
"$CHECKWISE_PYTHON" backend/manage.py seed
("$CHECKWISE_PYTHON" backend/manage.py runserver 127.0.0.1:8000 --noreload) &
backend_pid=$!
trap 'kill "$backend_pid" 2>/dev/null || true' EXIT INT TERM
cd frontend
npm run dev -- --host 127.0.0.1
