#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export DEBUG=true
export PAYMENT_PROVIDER=mock DETECTION_PROVIDER=mock REWRITE_PROVIDER=mock CELERY_TASK_ALWAYS_EAGER=true
.venv/bin/python backend/manage.py migrate --noinput
.venv/bin/python backend/manage.py seed
(.venv/bin/python backend/manage.py runserver 127.0.0.1:8000 --noreload) &
backend_pid=$!
trap 'kill "$backend_pid" 2>/dev/null || true' EXIT INT TERM
cd frontend
npm run dev -- --host 127.0.0.1
