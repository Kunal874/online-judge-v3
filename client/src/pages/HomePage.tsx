import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    title: "Write and run code",
    body: "C, C++, Java and Python in the browser. Run against your own input before committing to a submission.",
  },
  {
    title: "Judged in a sandbox",
    body: "Every submission executes in a throwaway container with no network, a read-only filesystem, and hard time and memory limits.",
  },
  {
    title: "Compete",
    body: "Timed contests with an ICPC-style leaderboard: ranked by problems solved, ties broken on penalty time.",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-20">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-semibold">Online Judge</h1>
        <p className="max-w-xl text-slate-600 dark:text-slate-400">
          Solve programming problems and have them graded automatically against a set of test
          cases — most of which you don&apos;t get to see.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            to="/problems"
            className="rounded bg-slate-900 px-5 py-2.5 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Browse problems
          </Link>
          <Link
            to="/contests"
            className="rounded border border-slate-300 px-5 py-2.5 text-sm dark:border-slate-600"
          >
            View contests
          </Link>
          {!user && (
            <Link
              to="/register"
              className="rounded border border-slate-300 px-5 py-2.5 text-sm dark:border-slate-600"
            >
              Create an account
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
          >
            <h2 className="text-sm font-semibold">{feature.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{feature.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
