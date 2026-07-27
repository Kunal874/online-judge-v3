import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { resetPasswordRequest } from "../api/auth";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await resetPasswordRequest({ token, newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(
        isAxiosError(err) ? (err.response?.data?.error ?? "Reset failed") : "Reset failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24 text-center">
        <p className="text-[var(--danger-ink)]">Missing reset token.</p>
        <Link to="/forgot-password" className="mt-2 inline-block text-sm underline">
          Request a new link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-24">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {done ? (
        <p className="text-sm text-[var(--second-ink)] ">
          Password updated. Redirecting to log in...
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-full border border-[var(--edge)] bg-[var(--surface)] px-4 py-2 text-sm"
          />
          {error && <p className="text-sm text-[var(--danger-ink)]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
          >
            {submitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}
    </main>
  );
}
