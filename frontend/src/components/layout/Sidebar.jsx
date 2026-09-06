import { GridIcon, BoxIcon, CartIcon, UsersIcon, ChartIcon, TruckIcon, DollarIcon, SettingsIcon } from "../icons.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: GridIcon },
  { id: "items", label: "Inventory", icon: BoxIcon },
  { id: "orders", label: "Sales", icon: CartIcon },
  { id: "procurement", label: "Procurement", icon: TruckIcon },
  { id: "finance", label: "Finance", icon: DollarIcon },
  { id: "customers", label: "Customers", icon: UsersIcon },
  { id: "reports", label: "Reports", icon: ChartIcon },
];

export default function Sidebar({ active, onNavigate, open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col " +
          "transition-transform lg:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-blue-600/30">
            E
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">ERP Demo</div>
            <div className="text-[11px] text-slate-400">Default Tenant</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose?.();
                }}
                className={
                  "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors duration-150 " +
                  (isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100")
                }
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-blue-600" />}
                <Icon width={18} height={18} className={isActive ? "text-blue-600" : "text-slate-400"} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200">
          <button
            onClick={() => onNavigate("settings")}
            className={
              "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors duration-150 " +
              (active === "settings" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100")
            }
          >
            {active === "settings" && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-blue-600" />}
            <SettingsIcon width={18} height={18} className={active === "settings" ? "text-blue-600" : "text-slate-400"} />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
