import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth.jsx";
import { api } from "../../lib/api.js";
import { MenuIcon, SearchIcon, BellIcon, ChevronDownIcon, AlertIcon } from "../icons.jsx";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  items: "Inventory",
  orders: "Sales",
  procurement: "Procurement",
  finance: "Finance",
  customers: "Customers",
  reports: "Reports",
  settings: "Settings",
};

const SEARCHABLE_PAGES = ["items", "orders", "customers", "reports"];

export default function Topbar({ active, searchTerm, onSearchChange, onMenuClick }) {
  const { session, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [failedOrders, setFailedOrders] = useState([]);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  const loadFailedOrders = useCallback(async () => {
    try {
      const page = await api.listOrders();
      setFailedOrders((page.content ?? []).filter((o) => o.status === "FAILED").slice(0, 5));
    } catch {
      // Notifications are a convenience, not core flow - fail silently rather
      // than surfacing a toast for a background badge fetch.
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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-white border-b border-slate-200">
      <button onClick={onMenuClick} className="lg:hidden text-slate-500">
        <MenuIcon />
      </button>

      <h1 className="text-base font-semibold text-slate-900 whitespace-nowrap">
        {PAGE_TITLES[active] ?? "Dashboard"}
      </h1>

      <div className="flex-1 max-w-md ml-2 hidden sm:block">
        <div className="relative">
          <SearchIcon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              active === "items" ? "Search items…" :
              active === "orders" ? "Search orders…" :
              active === "customers" ? "Search customers…" :
              active === "reports" ? "Search activity…" : "Search…"
            }
            className="input w-full pl-9"
            disabled={!SEARCHABLE_PAGES.includes(active)}
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <BellIcon width={19} height={19} />
            {failedOrders.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Failed orders
              </div>
              {failedOrders.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-400 text-center">Nothing needs attention</div>
              ) : (
                <ul className="max-h-72 overflow-y-auto">
                  {failedOrders.map((o) => (
                    <li key={o.id} className="px-4 py-2.5 border-b border-slate-50 last:border-0 flex gap-2.5">
                      <AlertIcon width={16} height={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-mono text-slate-700 truncate">{o.id.slice(0, 8)}…</div>
                        <div className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleString()}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-slate-100"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              {session.user.username.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-sm text-slate-700 hidden sm:inline">{session.user.username}</span>
            <ChevronDownIcon width={14} height={14} className="text-slate-400" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
              <div className="px-3.5 py-2 text-xs text-slate-400 border-b border-slate-100">
                {session.user.roles.join(", ") || "no roles"}
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
