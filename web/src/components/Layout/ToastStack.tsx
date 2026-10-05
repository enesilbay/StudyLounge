import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { useInboxStore } from '../../store/inboxStore';

/** Sağ altta kısa süreli bildirimler. Mobilde alt menünün üstünde durur. */
export default function ToastStack() {
  const toasts = useInboxStore((state) => state.toasts);
  const dismissToast = useInboxStore((state) => state.dismissToast);
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-20 z-40 flex flex-col items-end gap-2 sm:left-auto sm:w-80 lg:bottom-6 lg:right-6">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 shadow-lg">
          <Bell className="mt-0.5 h-[18px] w-[18px] shrink-0 text-primary" />
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              dismissToast(toast.id);
              if (toast.to) navigate(toast.to);
            }}
          >
            <span className="block truncate text-[15px] font-semibold text-textDark">{toast.title}</span>
            {toast.body ? <span className="mt-0.5 line-clamp-2 block text-sm text-textMuted">{toast.body}</span> : null}
          </button>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Bildirimi kapat" className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded text-textMuted hover:text-textDark">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
