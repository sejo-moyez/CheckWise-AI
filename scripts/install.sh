#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/pip install --require-hashes -r backend/requirements.lock
export DEBUG=true
.venv/bin/python backend/manage.py migrate --noinput
.venv/bin/python backend/manage.py seed
cd frontend
npm ci --no-fund
npm run build
