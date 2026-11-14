import { useAuth } from "../../lib/auth.jsx";
import {
  GridIcon, BoxIcon, CartIcon, UsersIcon, ChartIcon, TruckIcon, DollarIcon, SettingsIcon, LogOutIcon, LogoMark,
} from "../icons.jsx";

const SECTIONS = [
  { title: "Overview", items: [{ id: "dashboard", label: "Dashboard", icon: GridIcon }] },
  {
    title: "Operations",
    items: [
      { id: "items", label: "Inventory", icon: BoxIcon },
      { id: "orders", label: "Sales orders", icon: CartIcon },
      { id: "procurement", label: "Procurement", icon: TruckIcon },
    ],
  },
  {
    title: "Finance & insight",
    items: [
      { id: "finance", label: "Finance", icon: DollarIcon },
      { id: "reports", label: "Reports", icon: ChartIcon },
    ],
  },
  { title: "Relationships", items: [{ id: "customers", label: "Customers", icon: UsersIcon }] },
];

function NavButton({ item, active, onSelect }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onSelect(item.id)}
      aria-current={active ? "page" : undefined}
      className={
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-left transition-colors duration-150 " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 " +
        (active
          ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm shadow-brand-600/30"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
      }
    >
      <Icon width={18} height={18} className={active ? "text-white" : "text-slate-400"} />
      {item.label}
    </button>
  );
}

export default function Sidebar({ active, onNavigate, open, onClose }) {
  const { session, logout } = useAuth();
  const username = session?.user.username ?? "";
  const role = (session?.user.roles?.[0] ?? "member").replace(/^ROLE_/, "").toLowerCase();

  const select = (id) => {
    onNavigate(id);
    onClose?.();
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={
          "fixed lg:sticky top-0 inset-y-0 left-0 z-40 h-screen w-64 shrink-0 bg-white border-r border-slate-200/80 flex flex-col " +
          "transition-transform lg:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200/80">
          <LogoMark size={30} className="text-brand-600" />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-ink-900">Practical ERP</div>
            <div className="text-[11px] text-slate-400">Operations workspace</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavButton key={item.id} item={item} active={active === item.id} onSelect={select} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200/80 p-3 space-y-1">
          <NavButton
            item={{ id: "settings", label: "Settings", icon: SettingsIcon }}
            active={active === "settings"}
            onSelect={select}
          />
          <div className="mt-2 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-slate-800">{username}</div>
              <div className="truncate text-[11px] capitalize text-slate-400">{role}</div>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOutIcon width={16} height={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
