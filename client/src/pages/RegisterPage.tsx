import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", handle: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(
        isAxiosError(err) ? (err.response?.data?.error ?? "Registration failed") : "Registration failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-24">
      <h1 className="text-2xl font-semibold">Register</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={update("name")}
          required
          className="rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
        />
        <input
          type="text"
          placeholder="Handle (username)"
          value={form.handle}
          onChange={update("handle")}
          required
          className="rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={update("email")}
          required
          className="rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={form.password}
          onChange={update("password")}
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
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>
      <p className="text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
