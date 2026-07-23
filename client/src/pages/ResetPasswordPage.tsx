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
        <p className="text-red-600 dark:text-red-400">Missing reset token.</p>
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
        <p className="text-sm text-green-700 dark:text-green-400">
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
            className="rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {submitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}
    </main>
  );
}
