export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[80vw] rounded-lg border px-4 py-2.5 text-sm shadow-md animate-toast-in " +
        (isError
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-700")
      }
    >
      <div className="flex items-center gap-3">
        <span>{toast.message}</span>
        <button
          onClick={onDismiss}
          className="text-xs opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
