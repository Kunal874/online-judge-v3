import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { useNextPath } from "../hooks/useNextPath";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const next = useNextPath();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(next);
    } catch (err) {
      setError(isAxiosError(err) ? (err.response?.data?.error ?? "Login failed") : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-24">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-full border border-[var(--edge)] bg-[var(--surface)] px-4 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-full border border-[var(--edge)] bg-[var(--surface)] px-4 py-2 text-sm"
        />
        {error && <p className="text-sm text-[var(--danger-ink)]">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="text-sm text-[var(--ink-muted)]">
        No account?{" "}
        <Link to={`/register?next=${encodeURIComponent(next)}`} className="underline">
          Register
        </Link>
      </p>
      <Link to="/forgot-password" className="text-sm underline">
        Forgot password?
      </Link>
    </main>
  );
}
