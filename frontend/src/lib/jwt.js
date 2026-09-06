// Decodes the JWT payload for display purposes only (username, roles). This
// is NOT verification - the token's signature is only ever checked server-side
// by api-gateway. Never trust this decoded payload for an authorization
// decision in this app; it exists purely to render "logged in as X".
export function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
