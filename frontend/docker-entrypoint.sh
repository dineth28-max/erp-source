#!/bin/sh
set -e

# Regenerate env-config.js from the container's API_BASE_URL env var so the
# same built image can point at a different gateway without a rebuild.
#   unset          -> http://localhost:18080 (local docker-compose default)
#   set but empty  -> ""  = same origin: the browser calls /api/... on the host
#                     that served the page (Kubernetes: ALB routes /api to the gateway)
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__API_BASE_URL__ = "${API_BASE_URL-http://localhost:18080}";
EOF

exec nginx -g "daemon off;"
