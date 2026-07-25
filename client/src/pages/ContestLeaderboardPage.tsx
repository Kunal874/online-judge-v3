import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchLeaderboard } from "../api/contests";
import { useAuth } from "../context/AuthContext";
import ContestStatusBadge from "../components/contests/ContestStatusBadge";

export default function ContestLeaderboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data, isPending, isError } = useQuery({
    queryKey: ["leaderboard", slug],
    queryFn: () => fetchLeaderboard(slug!),
    enabled: Boolean(slug),
    // Standings only move while the contest is live; polling a finished
    // contest would be pure waste.
    refetchInterval: (query) => (query.state.data?.contest.status === "RUNNING" ? 20_000 : false),
    refetchIntervalInBackground: true,
  });

  if (isPending)
    return <main className="mx-auto max-w-4xl px-4 py-12 text-slate-500">Loading...</main>;
  if (isError || !data)
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-red-600 dark:text-red-400">Leaderboard not available.</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{data.contest.title}</h1>
        <ContestStatusBadge status={data.contest.status} />
      </div>
      <Link to={`/contests/${data.contest.slug}`} className="text-sm underline">
        Back to contest
      </Link>

      {data.rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Nobody has registered yet.</p>
      ) : (
        // The problem columns make this table wider than a phone screen;
        // it scrolls inside its own container rather than the page.
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Solved</th>
                <th className="px-3 py-2 font-medium">Penalty</th>
                {data.labels.map((label) => (
                  <th key={label} className="px-3 py-2 text-center font-mono font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const isMe = user?.handle === row.handle;
                return (
                  <tr
                    key={row.handle}
                    className={`border-b border-slate-100 dark:border-slate-800 ${
                      isMe ? "bg-sky-50 dark:bg-sky-900/20" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-slate-500">{row.rank}</td>
                    <td className="px-3 py-2">{row.handle}</td>
                    <td className="px-3 py-2">{row.solvedCount}</td>
                    <td className="px-3 py-2 text-slate-500">{row.penalty}</td>
                    {row.problems.map((cell) => (
                      <td key={cell.label} className="px-3 py-2 text-center">
                        {cell.solved ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{cell.attempts > 1 ? cell.attempts - 1 : ""}
                            <span className="ml-1 block text-xs text-slate-500">
                              {cell.solvedAtMinute}
                            </span>
                          </span>
                        ) : cell.attempts > 0 ? (
                          <span className="text-red-600 dark:text-red-400">−{cell.attempts}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Ranked by problems solved, then by penalty. Penalty is the minute each problem was solved,
        plus 20 minutes for every rejected attempt before it.
      </p>
    </main>
  );
}
