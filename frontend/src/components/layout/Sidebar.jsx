import { useEffect } from "react";
import { useAuth } from "../../lib/auth.jsx";
import {
  GridIcon, BoxIcon, CartIcon, UsersIcon, ChartIcon, TruckIcon, DollarIcon, SettingsIcon, LogOutIcon, LogoMark,
} from "../icons.jsx";

// Grouped by the job people come to do, in the words they use for it.
const SECTIONS = [
  { title: null, items: [{ id: "dashboard", label: "Dashboard", icon: GridIcon }] },
  {
    title: "Sales",
    items: [
      { id: "orders", label: "Sales orders", icon: CartIcon },
      { id: "customers", label: "Customers", icon: UsersIcon },
    ],
  },
  {
    title: "Stock",
    items: [
      { id: "items", label: "Inventory", icon: BoxIcon },
      { id: "procurement", label: "Purchasing", icon: TruckIcon },
    ],
  },
  {
    title: "Money",
    items: [
      { id: "finance", label: "Finance", icon: DollarIcon },
      { id: "reports", label: "Reports", icon: ChartIcon },
    ],
  },
];

function NavButton({ item, active, onSelect }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onSelect(item.id)}
      aria-current={active ? "page" : undefined}
      className={
        "group flex h-9 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-left text-sm transition-colors duration-100 " +
        (active
          ? "bg-slate-100 font-semibold text-ink-900"
          : "font-medium text-slate-600 hover:bg-slate-50 hover:text-ink-900")
      }
    >
      <Icon
        width={18}
        height={18}
        aria-hidden="true"
        className={active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}
      />
      {item.label}
    </button>
  );
}

export default function Sidebar({ active, onNavigate, open, onClose }) {
  const { session, logout } = useAuth();
  const username = session?.user.username ?? "";
  const role = (session?.user.roles?.[0] ?? "member").replace(/^ROLE_/, "").toLowerCase();

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const select = (id) => {
    onNavigate(id);
    onClose?.();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink-900/30 animate-fade-in lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={
          "fixed inset-y-0 left-0 top-0 z-40 flex h-screen w-60 shrink-0 flex-col border-r border-[var(--rule)] bg-sheet " +
          "transition-transform duration-200 ease-[var(--ease-out-snappy)] lg:sticky lg:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex h-14 items-center gap-2.5 px-5">
          <LogoMark size={26} className="text-brand-600" />
          <span translate="no" className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">Practical ERP</span>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-3" aria-label="Main">
          {SECTIONS.map((section, i) => (
            <div key={section.title ?? i}>
              {section.title && (
                <div className="px-3 pb-1.5 text-xs font-medium text-slate-400">{section.title}</div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavButton key={item.id} item={item} active={active === item.id} onSelect={select} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-[var(--rule-soft)] p-3">
          <NavButton
            item={{ id: "settings", label: "Settings", icon: SettingsIcon }}
            active={active === "settings"}
            onSelect={select}
          />
          <div className="flex items-center gap-3 px-3 py-1.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
              aria-hidden="true"
            >
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-ink-900">{username}</div>
              <div className="truncate text-xs capitalize text-slate-500">{role}</div>
            </div>
            <button
              onClick={logout}
              className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink-900"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOutIcon width={17} height={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
