import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/utils/cn";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface Ctx {
  push: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<Ctx>({ push: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const styles: Record<ToastKind, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-slate-200 bg-white text-slate-800",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ zIndex: 10000 }} className="fixed bottom-4 right-4 flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-3 shadow-soft animate-fade-in max-w-sm",
                styles[t.kind]
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm">{t.message}</span>
              <button
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="ml-auto text-current/60 hover:text-current"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
