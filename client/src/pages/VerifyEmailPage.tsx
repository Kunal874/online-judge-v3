import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { verifyEmailRequest } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24 text-center">
        <h1 className="text-xl font-semibold text-red-600 dark:text-red-400">Verification failed</h1>
        <p className="mt-2 text-sm text-slate-500">Missing verification token.</p>
      </main>
    );
  }

  return <VerifyingEmail token={token} />;
}

// A real token is required to reach this component (see the early return
// above), so the effect here only ever does the one thing it's for:
// kicking off the actual async verification request.
function VerifyingEmail({ token }: { token: string }) {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState("");
  const { refetchUser } = useAuth();
  // The verify token is single-use server-side, so this effect firing
  // twice — React StrictMode's dev-only double-invoke, or in production a
  // corporate email scanner pre-visiting the link — must not send the
  // request twice: the second call would always fail (token already
  // consumed) even though verification genuinely succeeded.
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;

    verifyEmailRequest(token)
      .then(async () => {
        await refetchUser();
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setError(
          isAxiosError(err) ? (err.response?.data?.error ?? "Verification failed") : "Verification failed",
        );
      });
    // Only re-run if the token itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="mx-auto max-w-sm px-4 py-24 text-center">
      {status === "verifying" && <p className="text-slate-500">Verifying your email...</p>}
      {status === "success" && (
        <>
          <h1 className="text-xl font-semibold text-green-700 dark:text-green-400">Email verified</h1>
          <Link to="/" className="mt-4 inline-block underline">
            Go to homepage
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-xl font-semibold text-red-600 dark:text-red-400">Verification failed</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </>
      )}
    </main>
  );
}
