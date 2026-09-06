import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, setAccessToken, setUnauthorizedHandler } from "./api.js";
import { decodeJwtPayload } from "./jwt.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "erp.session";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { accessToken, refreshToken, user }
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAccessToken(parsed.accessToken);
        setSession(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  const applyAuthResponse = useCallback((authResponse) => {
    const payload = decodeJwtPayload(authResponse.accessToken);
    const next = {
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      user: {
        username: payload?.sub ?? "unknown",
        roles: payload?.roles ?? [],
        tenantId: payload?.tid ?? null,
      },
    };
    setAccessToken(next.accessToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const login = useCallback(
    async (username, password) => {
      const res = await api.login(username, password);
      applyAuthResponse(res);
    },
    [applyAuthResponse]
  );

  const register = useCallback(
    async (username, email, password) => {
      const res = await api.register(username, email, password);
      applyAuthResponse(res);
    },
    [applyAuthResponse]
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  // A 401 from any API call (expired/invalid token) drops the session back
  // to the login screen instead of leaving the app stuck showing stale data.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = {
    ready,
    session,
    isAuthenticated: !!session,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
