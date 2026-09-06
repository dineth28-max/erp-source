// Default for local `npm run dev` / `npm run build` (outside Docker). The
// Docker image overwrites this file at container start from the
// API_BASE_URL env var - see docker-entrypoint.sh.
window.__API_BASE_URL__ = "http://localhost:18080";
