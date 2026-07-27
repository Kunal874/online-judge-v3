import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { resendVerificationRequest, verifyEmailRequest } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useNextPath } from "../hooks/useNextPath";
import { apiErrorMessage, apiFieldErrors } from "../lib/apiError";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const { user, isLoading, refetchUser, logout } = useAuth();
  const navigate = useNavigate();
  const next = useNextPath();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Mirrors the server's own per-account cooldown. Purely a courtesy — the
  // server rejects an early resend regardless of what this says.
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (isLoading) return null;
  // The code is redeemed against the signed-in account, so there is nothing
  // this page can do for a signed-out visitor.
  if (!user) return <Navigate to="/login?next=/verify-email" replace />;
  if (user.emailVerified) return <Navigate to={next} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await verifyEmailRequest(code);
      await refetchUser();
      navigate(next);
    } catch (err) {
      const fields = apiFieldErrors(err);
      setError(fields.code ?? apiErrorMessage(err, "Verification failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await resendVerificationRequest();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice("A new code is on its way. It expires in 10 minutes.");
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't send a new code. Please try again shortly."));
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-20">
      <div>
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          We sent a 6-digit code to <span className="font-medium">{user.email}</span>. Enter it
          below to finish setting up your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={code}
          onChange={(e) => {
            // Strip everything but digits as it is typed, so a pasted code
            // with a stray space isn't rejected for a formatting reason the
            // user can't see.
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          aria-label="6-digit verification code"
          className="w-full rounded border border-[var(--edge)] bg-transparent px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] "
        />

        {error && (
          <p className="rounded border border-[var(--danger)] bg-[var(--danger-tint)] p-2 text-sm text-[var(--danger-ink)]">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-[var(--second-ink)] ">{notice}</p>}

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
        >
          {submitting ? "Verifying..." : "Verify"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="underline disabled:no-underline disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
        </button>
        {/* Not a skip — every other route bounces back here while
            unverified. This is only an escape hatch for a typo'd email
            address, where no code could ever arrive and the account is a
            dead end otherwise. */}
        <button onClick={() => logout()} className="text-[var(--ink-muted)] underline">
          Wrong email? Log out
        </button>
      </div>
    </main>
  );
}
