import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { ApiError } from "../lib/api.js";
import { LogoMark, EyeIcon, EyeOffIcon, BoxIcon, CartIcon, DollarIcon } from "./icons.jsx";

const MODULES = [
  { icon: BoxIcon, title: "Inventory", text: "Live stock across your warehouse, reserved the moment an order is placed." },
  { icon: CartIcon, title: "Sales & purchasing", text: "Orders, customers and purchase orders in one flow." },
  { icon: DollarIcon, title: "Finance", text: "A double-entry ledger kept in step with every sale and receipt." },
];

export default function AuthPage({ notify }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError("");
    setPassword("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password);
        notify("success", "Account created - welcome to Practical ERP");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? "Incorrect username or password."
            : err.message
          : "Can't reach the server. Check your connection and try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-ink-900">
      {/* ------------------------------------------------ Left: brand panel */}
      <section className="relative hidden lg:flex flex-col justify-between px-14 xl:px-20 py-12 text-white overflow-hidden">
        {/* quiet geometric texture, not a stock illustration */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)",
          }}
        />

        <header className="relative flex items-center gap-3">
          <LogoMark size={36} className="text-emerald-brand" />
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Practical ERP</div>
            <div className="text-[11px] text-white/45">Operations workspace</div>
          </div>
        </header>

        <div className="relative max-w-lg">
          <h1 className="text-[56px] xl:text-[64px] font-light tracking-tight leading-none">Welcome</h1>
          <p className="mt-5 text-lg text-white/80">
            {isLogin ? "Sign in to pick up where your team left off." : "Create your account to get started."}
          </p>

          <ul className="mt-10 space-y-5">
            {MODULES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/10">
                  <Icon width={18} height={18} className="text-emerald-300" />
                </span>
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-sm text-white/55 leading-relaxed">{text}</div>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => switchMode(isLogin ? "register" : "login")}
            className="mt-10 inline-flex items-center rounded-md bg-emerald-brand px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-emerald-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {isLogin ? "Register here" : "I already have an account"}
          </button>
        </div>

        <footer className="relative text-[11px] uppercase tracking-wider text-white/35">
          © {new Date().getFullYear()} Practical ERP
        </footer>
      </section>

      {/* ---------------------------------------------- Right: form panel */}
      <section className="flex flex-col justify-center bg-emerald-brand px-6 sm:px-12 xl:px-20 py-12 text-white">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="lg:hidden mb-10 flex items-center gap-3">
            <LogoMark size={32} className="text-ink-900" />
            <span className="font-semibold">Practical ERP</span>
          </div>

          <h2 className="text-[28px] font-light tracking-tight">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-white/75">
            {isLogin ? "Use the username you registered with." : "It takes less than a minute."}
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-7" noValidate={false}>
            <UnderlineField
              label="Username"
              autoComplete="username"
              value={username}
              onChange={setUsername}
              required
              minLength={3}
            />

            {!isLogin && (
              <UnderlineField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                required
              />
            )}

            <UnderlineField
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={setPassword}
              required
              minLength={isLogin ? undefined : 8}
              hint={isLogin ? undefined : "At least 8 characters."}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-1 text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
                </button>
              }
            />

            {error && (
              <p role="alert" className="rounded-md bg-ink-900/25 px-3 py-2 text-sm text-white ring-1 ring-white/20">
                {error}
              </p>
            )}

            <div className="flex items-center gap-5 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-brand-dark shadow-sm hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-brand"
              >
                {submitting ? (isLogin ? "Signing in…" : "Creating…") : isLogin ? "Sign in" : "Create account"}
              </button>
              <button
                type="button"
                onClick={() => switchMode(isLogin ? "register" : "login")}
                className="text-sm text-white/80 underline-offset-4 hover:text-white hover:underline lg:hidden"
              >
                {isLogin ? "Create an account" : "Back to sign in"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function UnderlineField({ label, value, onChange, trailing, hint, type = "text", ...rest }) {
  return (
    <label className="block">
      <span className="text-sm text-white/85">{label}</span>
      <span className="mt-1 flex items-center border-b border-white/50 focus-within:border-white transition-colors">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2 text-[15px] text-white placeholder:text-white/40 outline-none"
          {...rest}
        />
        {trailing}
      </span>
      {hint && <span className="mt-1 block text-xs text-white/60">{hint}</span>}
    </label>
  );
}
