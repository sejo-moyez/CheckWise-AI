#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DEBUG=true .venv/bin/python backend/manage.py test apps.core --verbosity 1
DEBUG=true .venv/bin/python backend/manage.py makemigrations --check --dry-run
DEBUG=true .venv/bin/python backend/manage.py spectacular --file docs/openapi.yaml --validate --fail-on-warn
cd frontend
npm test
npm run build
