import { CheckCircleIcon, XCircleIcon } from "./icons.jsx";

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  const Icon = isError ? XCircleIcon : CheckCircleIcon;
  return (
    <div
      role={isError ? "alert" : "status"}
      className="animate-toast-in fixed left-1/2 top-4 z-50 flex max-w-[min(32rem,90vw)] -translate-x-1/2 items-start gap-3 rounded-[var(--radius-sheet)] bg-sheet py-3 pl-4 pr-2 text-sm text-ink-900 shadow-[0_0_0_1px_var(--rule),0_8px_24px_rgba(24,32,28,0.14)]"
    >
      <Icon width={18} height={18} aria-hidden="true" className={"mt-px shrink-0 " + (isError ? "text-bad" : "text-ok-ink")} />
      <span className="flex-1 pt-px">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="-my-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-slate-400 hover:bg-slate-100 hover:text-ink-900"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
