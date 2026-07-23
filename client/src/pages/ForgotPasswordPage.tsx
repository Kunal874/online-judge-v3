import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordRequest } from "../api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPasswordRequest({ email });
    } finally {
      // Always show the same confirmation, whether or not the email
      // exists — the API itself never reveals that either.
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-24">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      {submitted ? (
        <p className="text-sm text-slate-500">
          If that email is registered, we've sent a link to reset your password.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
      <Link to="/login" className="text-sm underline">
        Back to log in
      </Link>
    </main>
  );
}
