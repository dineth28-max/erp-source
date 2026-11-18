import { useCallback, useRef, useState } from "react";
import { useAuth } from "./lib/auth.jsx";
import AuthPage from "./components/AuthPage.jsx";
import DashboardPage from "./components/DashboardPage.jsx";
import ItemsPage from "./components/ItemsPage.jsx";
import OrdersPage from "./components/OrdersPage.jsx";
import CustomersPage from "./components/CustomersPage.jsx";
import ReportsPage from "./components/ReportsPage.jsx";
import ProcurementPage from "./components/ProcurementPage.jsx";
import FinancePage from "./components/FinancePage.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import Toast from "./components/Toast.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import Topbar from "./components/layout/Topbar.jsx";

export default function App() {
  const { ready, isAuthenticated } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const ordersRef = useRef(null);

  const notify = useCallback((type, message) => {
    setToast({ type, message });
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const navigate = useCallback((id) => {
    setPage(id);
    setSearchTerm("");
  }, []);

  if (!ready) return null;

  if (!isAuthenticated) {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <AuthPage notify={notify} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-sheet focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-600 focus:shadow-[0_0_0_1px_var(--rule),0_6px_16px_rgba(24,32,28,0.12)]"
      >
        Skip to content
      </a>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <Sidebar active={page} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          active={page}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main id="main" tabIndex={-1} key={page} className="flex-1 overflow-y-auto animate-fade-in outline-none">
          {page === "dashboard" && <DashboardPage notify={notify} onNavigate={navigate} />}
          {page === "items" && (
            <ItemsPage notify={notify} searchTerm={searchTerm} onOrderPlaced={() => ordersRef.current?.reload()} />
          )}
          {page === "orders" && <OrdersPage notify={notify} searchTerm={searchTerm} ref={ordersRef} />}
          {page === "customers" && <CustomersPage notify={notify} searchTerm={searchTerm} />}
          {page === "reports" && <ReportsPage notify={notify} searchTerm={searchTerm} />}
          {page === "procurement" && <ProcurementPage notify={notify} />}
          {page === "finance" && <FinancePage notify={notify} />}
          {page === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
