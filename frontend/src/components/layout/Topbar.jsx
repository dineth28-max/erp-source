import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { MenuIcon, SearchIcon, BellIcon, XCircleIcon, CheckCircleIcon } from "../icons.jsx";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  items: "Inventory",
  orders: "Sales orders",
  procurement: "Purchasing",
  finance: "Finance",
  reports: "Reports",
  customers: "Customers",
  settings: "Settings",
};

const SEARCH_PLACEHOLDER = {
  items: "Search by item name or SKU…",
  orders: "Search orders…",
  customers: "Search customers…",
  reports: "Search stock movements…",
};

export default function Topbar({ active, searchTerm, onSearchChange, onMenuClick }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [failedOrders, setFailedOrders] = useState([]);
  const notifRef = useRef(null);
  const panelId = useId();

  // Only the newest 20 orders: the badge is about recent problems.
  const loadFailedOrders = useCallback(async () => {
    try {
      const page = await api.listRecentOrders(20);
      setFailedOrders((page.content ?? []).filter((o) => o.status === "FAILED").slice(0, 5));
    } catch {
      // Background badge - stay quiet rather than toasting.
    }
  }, []);

  useEffect(() => {
    loadFailedOrders();
  }, [loadFailedOrders]);

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e) => notifRef.current && !notifRef.current.contains(e.target) && setNotifOpen(false);
    const onKey = (e) => e.key === "Escape" && setNotifOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  const title = PAGE_TITLES[active] ?? PAGE_TITLES.dashboard;
  const searchable = active in SEARCH_PLACEHOLDER;
  const count = failedOrders.length;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--rule-soft)] bg-canvas/90 px-4 backdrop-blur-sm lg:px-8">
      <button
        onClick={onMenuClick}
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon width={20} height={20} />
      </button>

      <h1 className="truncate text-lg font-semibold tracking-[-0.01em] text-ink-900">{title}</h1>

      {searchable && (
        <div className="ml-4 hidden max-w-sm flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">Search</span>
            <SearchIcon
              width={16}
              height={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              name="search"
              autoComplete="off"
              spellCheck={false}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER[active]}
              className="input h-9 w-full bg-white py-0 pl-9"
            />
          </label>
        </div>
      )}

      <div className="relative ml-auto" ref={notifRef}>
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink-900"
          aria-label={count ? `Notifications: ${count} failed ${count === 1 ? "order" : "orders"}` : "Notifications"}
          aria-expanded={notifOpen}
          aria-controls={panelId}
        >
          <BellIcon width={19} height={19} />
          {count > 0 && (
            <span className="num absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-canvas">
              {count}
            </span>
          )}
        </button>

        {notifOpen && (
          <div
            id={panelId}
            className="animate-pop-in absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-[var(--radius-sheet)] bg-sheet shadow-[0_0_0_1px_var(--rule),0_8px_24px_rgba(24,32,28,0.12)]"
          >
            <div className="flex items-baseline justify-between px-4 pb-2 pt-3">
              <span className="text-sm font-semibold text-ink-900">Notifications</span>
              <span className="text-xs text-slate-500">From the last 20 orders</span>
            </div>
            {count === 0 ? (
              <div className="flex items-center gap-2 px-4 pb-4 pt-1 text-sm text-slate-600">
                <CheckCircleIcon width={16} height={16} className="text-ok-ink" aria-hidden="true" />
                No failed orders. Nothing to follow up.
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto border-t border-[var(--rule-soft)]">
                {failedOrders.map((o) => (
                  <li key={o.id} className="flex gap-3 border-b border-[var(--rule-soft)] px-4 py-3 last:border-0">
                    <XCircleIcon width={17} height={17} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-sm text-ink-900">
                        Order <span className="num font-medium">#{o.id.slice(0, 8)}</span> failed
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(o.createdAt).toLocaleString(undefined, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
