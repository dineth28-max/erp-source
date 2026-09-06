import { useAuth } from "../lib/auth.jsx";

export default function SettingsPage() {
  const { session, logout } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-4">Account</h2>
        <dl className="text-sm grid grid-cols-[120px_1fr] gap-y-3">
          <dt className="text-slate-400">Username</dt>
          <dd>{session.user.username}</dd>
          <dt className="text-slate-400">Roles</dt>
          <dd>{session.user.roles.join(", ") || "—"}</dd>
          <dt className="text-slate-400">Tenant ID</dt>
          <dd className="font-mono text-xs">{session.user.tenantId}</dd>
        </dl>
        <button onClick={logout} className="btn-secondary mt-5">
          Log out
        </button>
      </section>

      <p className="text-xs text-slate-400 mt-4">
        This is intentionally bare — there's no tenant/user-management, notification
        preferences, or billing here yet because those aren't real features in the backend.
        Adding controls that don't do anything would be worse than not having a Settings page.
      </p>
    </div>
  );
}
