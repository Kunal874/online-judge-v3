import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface LoginRequiredDialogProps {
  /** What the user was trying to do, e.g. "run code" — completes "Log in to …". */
  action: string;
  onClose: () => void;
}

// Shown when a signed-out visitor presses a button that needs an account.
// Sending them straight to /login would silently discard the code they just
// wrote, so this asks first and carries the current page along as `next` so
// logging in returns them here rather than to the homepage.
export default function LoginRequiredDialog({ action, onClose }: LoginRequiredDialogProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const next = encodeURIComponent(location.pathname + location.search);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[28px] border border-[var(--edge)] bg-[var(--surface-raised)] p-5 shadow-lg  "
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="login-required-title" className="text-lg font-semibold">
          Log in to {action}
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Your code stays right here — we&apos;ll bring you back to this problem afterwards.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => navigate(`/login?next=${next}`)}
            className="flex-1 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
          >
            Log in
          </button>
          <button
            onClick={() => navigate(`/register?next=${next}`)}
            className="flex-1 rounded border border-[var(--edge)] px-3 py-2 text-sm "
          >
            Create account
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full text-xs text-[var(--ink-muted)] underline dark:text-[var(--ink-muted)]"
        >
          Keep editing
        </button>
      </div>
    </div>
  );
}
