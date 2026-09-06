import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { ApiError } from "../lib/api.js";

export default function AuthPage({ notify }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState("login");
  const [submitting, setSubmitting] = useState(false);

  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("Passw0rd!");

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(loginUsername, loginPassword);
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(regUsername, regEmail, regPassword);
      notify("success", "Account created");
    } catch (err) {
      notify("error", err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8">
        <h1 className="text-xl font-semibold">ERP Demo</h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          identity-service &middot; inventory-service &middot; sales-service &middot; api-gateway
        </p>

        <div className="flex gap-1 border-b border-slate-200 mb-5">
          {["login", "register"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "px-3 py-2 text-sm -mb-px border-b-2 " +
                (tab === t
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-700")
              }
            >
              {t === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <Field label="Username">
              <input
                className="input"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className="input"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </Field>
            <button type="submit" disabled={submitting} className="btn-primary mt-2">
              {submitting ? "Logging in…" : "Log in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <Field label="Username">
              <input
                className="input"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="input"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className="input"
                minLength={8}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </Field>
            <button type="submit" disabled={submitting} className="btn-primary mt-2">
              {submitting ? "Creating…" : "Register"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      {children}
    </label>
  );
}
