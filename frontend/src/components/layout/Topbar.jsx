import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth.jsx";
import { api } from "../../lib/api.js";
import { MenuIcon, SearchIcon, BellIcon, ChevronDownIcon, XCircleIcon, LogOutIcon } from "../icons.jsx";

const PAGES = {
  dashboard: { title: "Dashboard", section: "Overview" },
  items: { title: "Inventory", section: "Operations" },
  orders: { title: "Sales orders", section: "Operations" },
  procurement: { title: "Procurement", section: "Operations" },
  finance: { title: "Finance", section: "Finance & insight" },
  reports: { title: "Reports", section: "Finance & insight" },
  customers: { title: "Customers", section: "Relationships" },
  settings: { title: "Settings", section: "Workspace" },
};

const SEARCH_PLACEHOLDER = {
  items: "Search items by name or SKU…",
  orders: "Search orders…",
  customers: "Search customers…",
  reports: "Search activity…",
};

export default function Topbar({ active, searchTerm, onSearchChange, onMenuClick }) {
  const { session, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [failedOrders, setFailedOrders] = useState([]);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  // Only the newest 20 orders - the badge is about recent problems, and the
  // old version downloaded 200 orders on every page load.
  const loadFailedOrders = useCallback(async () => {
    try {
      const page = await api.listRecentOrders(20);
      setFailedOrders((page.content ?? []).filter((o) => o.status === "FAILED").slice(0, 5));
    } catch {
      // Background badge - fail silently rather than toasting.
    }
  }, []);

  useEffect(() => {
    loadFailedOrders();
  }, [loadFailedOrders]);

  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const page = PAGES[active] ?? PAGES.dashboard;
  const searchable = active in SEARCH_PLACEHOLDER;
  const username = session.user.username;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:px-8">
      <button onClick={onMenuClick} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <MenuIcon />
      </button>

      <div className="min-w-0 leading-tight">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">{page.section}</div>
        <h1 className="truncate text-lg font-semibold tracking-tight text-ink-900">{page.title}</h1>
      </div>

      {searchable && (
        <div className="ml-6 hidden max-w-md flex-1 md:block">
          <div className="relative">
            <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER[active]}
              aria-label="Search"
              className="input w-full bg-slate-50 pl-9 focus:bg-white"
            />
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label={`Notifications${failedOrders.length ? `, ${failedOrders.length} failed orders` : ""}`}
            aria-expanded={notifOpen}
          >
            <BellIcon width={19} height={19} />
            {failedOrders.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--chart-status-critical)] px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                {failedOrders.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">Notifications</span>
                <span className="text-xs text-slate-400">Last 20 orders</span>
              </div>
              {failedOrders.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">Nothing needs your attention</div>
              ) : (
                <ul className="max-h-72 overflow-y-auto">
                  {failedOrders.map((o) => (
                    <li key={o.id} className="flex gap-3 border-b border-slate-50 px-4 py-3 last:border-0">
                      <XCircleIcon width={18} height={18} className="mt-0.5 shrink-0 text-[var(--chart-status-critical)]" />
                      <div className="min-w-0">
                        <div className="text-sm text-slate-700">
                          Order <span className="font-mono">{o.id.slice(0, 8)}</span> failed
                        </div>
                        <div className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mx-2 hidden h-6 w-px bg-slate-200 sm:block" />

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-sm font-medium text-slate-800">{username}</div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--chart-status-good)]" aria-hidden="true" />
                Online
              </div>
            </div>
            <ChevronDownIcon width={14} height={14} className="text-slate-400" />
          </button>
          {userMenuOpen && (
            <div role="menu" className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <div className="text-sm font-medium text-slate-800">{username}</div>
                <div className="text-xs text-slate-400">
                  {session.user.roles.map((r) => r.replace(/^ROLE_/, "").toLowerCase()).join(", ") || "member"}
                </div>
              </div>
              <button
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                <LogOutIcon width={16} height={16} className="text-slate-400" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
