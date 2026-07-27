import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNextPath } from "../hooks/useNextPath";
import { apiErrorMessage, apiFieldErrors } from "../lib/apiError";

const INPUT_CLASS = "w-full rounded border bg-transparent px-3 py-2";
const OK_BORDER = "border-[var(--edge)]";
const BAD_BORDER = "border-[var(--danger)]";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {/* The hint stays visible until it is replaced by a real error, so the
          rules are known before the form is submitted rather than after. */}
      {error ? (
        <p className="text-xs text-[var(--danger-ink)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const next = useNextPath();
  const [form, setForm] = useState({ email: "", password: "", handle: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      // Clear this field's error as soon as it is edited — leaving a stale
      // complaint under a box the user has already fixed reads as a bug.
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const rest = { ...prev };
        delete rest[field];
        return rest;
      });
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(form);
      // Straight to verification rather than to `next` — a code was just
      // emailed, and burying that behind a redirect to the problem list is
      // how accounts end up permanently half-registered. `next` rides along
      // so finishing there still lands where they were originally headed.
      navigate(`/verify-email?next=${encodeURIComponent(next)}`);
    } catch (err) {
      const fields = apiFieldErrors(err);
      setFieldErrors(fields);
      // A 400 already explained itself field by field; repeating the generic
      // "Invalid request" above them would just be noise.
      if (Object.keys(fields).length === 0) {
        setError(apiErrorMessage(err, "Registration failed. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-20">
      <div>
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Already registered?{" "}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="underline">
            Log in instead
          </Link>
          .
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <Field label="Name" error={fieldErrors.name}>
          <input
            type="text"
            value={form.name}
            onChange={update("name")}
            autoComplete="name"
            className={`${INPUT_CLASS} ${fieldErrors.name ? BAD_BORDER : OK_BORDER}`}
          />
        </Field>

        <Field
          label="Handle"
          hint="3–20 characters. Letters, numbers and underscores. Shown on leaderboards."
          error={fieldErrors.handle}
        >
          <input
            type="text"
            value={form.handle}
            onChange={update("handle")}
            autoComplete="username"
            className={`${INPUT_CLASS} ${fieldErrors.handle ? BAD_BORDER : OK_BORDER}`}
          />
        </Field>

        <Field label="Email" hint="Used to verify your account." error={fieldErrors.email}>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            autoComplete="email"
            className={`${INPUT_CLASS} ${fieldErrors.email ? BAD_BORDER : OK_BORDER}`}
          />
        </Field>

        <Field label="Password" hint="At least 8 characters." error={fieldErrors.password}>
          <input
            type="password"
            value={form.password}
            onChange={update("password")}
            autoComplete="new-password"
            className={`${INPUT_CLASS} ${fieldErrors.password ? BAD_BORDER : OK_BORDER}`}
          />
        </Field>

        {error && (
          <p className="rounded border border-[var(--danger)] bg-[var(--danger-tint)] p-2 text-sm text-[var(--danger-ink)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
        >
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>
    </main>
  );
}
