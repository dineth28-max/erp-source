#!/bin/sh
set -e

# Regenerate env-config.js from the container's API_BASE_URL env var so the
# same built image can point at a different gateway without a rebuild.
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__API_BASE_URL__ = "${API_BASE_URL:-http://localhost:18080}";
EOF

exec nginx -g "daemon off;"
