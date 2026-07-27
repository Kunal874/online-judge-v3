import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchContestBySlug, registerForContest } from "../api/contests";
import { useAuth } from "../context/AuthContext";
import { formatDuration, useCountdown } from "../hooks/useCountdown";
import ContestStatusBadge from "../components/contests/ContestStatusBadge";
import DifficultyBadge from "../components/problems/DifficultyBadge";

export default function ContestDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: contest,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["contest", slug],
    queryFn: () => fetchContestBySlug(slug!),
    enabled: Boolean(slug),
    // While a contest is upcoming the problem list is withheld; refetching
    // means the page fills in at start time without a manual reload.
    refetchInterval: (query) => (query.state.data?.status === "UPCOMING" ? 15_000 : false),
  });

  const register = useMutation({
    mutationFn: () => registerForContest(slug!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contest", slug] }),
  });

  // Counts down to whichever boundary is next, so the same element reads
  // "Starts in" before the contest and "Ends in" during it.
  const countdownTarget =
    contest?.status === "UPCOMING"
      ? contest.startsAt
      : contest?.status === "RUNNING"
        ? contest.endsAt
        : null;
  const remainingMs = useCountdown(countdownTarget ?? null);

  if (isPending) return <main className="mx-auto max-w-3xl px-4 py-12 text-[var(--ink-muted)]">Loading...</main>;
  if (isError || !contest)
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-[var(--danger-ink)]">Contest not found.</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{contest.title}</h1>
        <ContestStatusBadge status={contest.status} />
      </div>

      <div className="mb-6 text-sm text-[var(--ink-muted)]">
        {new Date(contest.startsAt).toLocaleString()} –{" "}
        {new Date(contest.endsAt).toLocaleString()}
        {remainingMs !== null && (
          <span className="ml-2 font-medium text-[var(--ink)]">
            {contest.status === "UPCOMING" ? "Starts in" : "Ends in"} {formatDuration(remainingMs)}
          </span>
        )}
      </div>

      {contest.description && (
        <p className="mb-6 whitespace-pre-wrap text-sm text-[var(--ink)]">
          {contest.description}
        </p>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-3">
        {contest.status !== "ENDED" &&
          (!user ? (
            <Link to="/login" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45">
              Log in to register
            </Link>
          ) : contest.isRegistered ? (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              You are registered
            </span>
          ) : (
            <button
              onClick={() => register.mutate()}
              disabled={register.isPending}
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm text-[var(--accent-contrast)] transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-45"
            >
              {register.isPending ? "Registering..." : "Register"}
            </button>
          ))}
        <Link to={`/contests/${contest.slug}/leaderboard`} className="text-sm underline">
          Leaderboard
        </Link>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Problems</h2>

      {contest.problems === null ? (
        <p className="text-sm text-[var(--ink-muted)]">
          Problems are revealed when the contest starts.
        </p>
      ) : contest.problems.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">No problems have been added to this contest.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {contest.problems.map((cp) => (
            <Link
              key={cp.label}
              to={`/contests/${contest.slug}/problems/${cp.label}`}
              className="flex items-center gap-3 rounded border border-[var(--edge)] p-3 hover:border-[var(--accent)]"
            >
              <span className="w-6 font-mono text-sm text-[var(--ink-muted)]">{cp.label}</span>
              <span className="flex-1">{cp.problem.title}</span>
              <span className="text-xs text-[var(--ink-muted)]">{cp.points} pts</span>
              <DifficultyBadge difficulty={cp.problem.difficulty} />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
