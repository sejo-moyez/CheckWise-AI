#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/python.sh"
cd "$CHECKWISE_ROOT"
checkwise_venv_python
checkwise_node
"$CHECKWISE_PYTHON" -m unittest discover -s scripts/tests
DEBUG=true "$CHECKWISE_PYTHON" backend/manage.py test apps.core --verbosity 1
DEBUG=true "$CHECKWISE_PYTHON" backend/manage.py makemigrations --check --dry-run
DEBUG=true "$CHECKWISE_PYTHON" backend/manage.py spectacular --file docs/openapi.yaml --validate --fail-on-warn
cd frontend
npm test
npm run build
