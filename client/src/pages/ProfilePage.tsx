import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { Verdict } from "@online-judge/shared";
import { useAuth } from "../context/AuthContext";
import { fetchUserProfile } from "../api/users";
import { fetchSubmissions } from "../api/submissions";
import Heatmap from "../components/profile/Heatmap";
import VerdictBadge from "../components/submissions/VerdictBadge";
import { LANGUAGE_LABELS } from "../lib/languageStubs";

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="surface flex flex-col gap-0.5 p-5">
      <div className="font-heading text-4xl tabular-nums">{value}</div>
      <div className="text-[12px] text-[var(--ink-muted)]">{label}</div>
      {note && <div className="mt-1 text-[11px] text-[var(--ink-muted)]">{note}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: profile, isPending } = useQuery({
    queryKey: ["profile", user?.handle],
    queryFn: () => fetchUserProfile(user!.handle),
    enabled: !!user,
  });

  // Recent attempts serve both the verdict breakdown and the activity list,
  // so one request covers both rather than adding an endpoint for a summary
  // the client can derive itself.
  const { data: recent } = useQuery({
    queryKey: ["submissions", "recent"],
    queryFn: () => fetchSubmissions({ pageSize: 50 }),
    enabled: !!user,
  });

  const verdictCounts = (recent?.items ?? []).reduce<Partial<Record<Verdict, number>>>(
    (acc, submission) => {
      acc[submission.verdict] = (acc[submission.verdict] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const verdictRows = (Object.entries(verdictCounts) as [Verdict, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const recentTotal = recent?.items.length ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="mb-8 flex flex-wrap items-end gap-4">
        <div className="grid size-14 place-items-center rounded-full bg-[var(--accent)] font-heading text-[18px] text-[var(--accent-contrast)] uppercase">
          {user?.handle.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-4xl">{user?.handle}</h1>
          <p className="text-[13px] text-[var(--ink-muted)]">{user?.email}</p>
        </div>
      </header>

      {isPending && <p className="text-[var(--ink-muted)]">Loading activity…</p>}

      {profile && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Problems solved" value={profile.solvedCount} />
            <Stat
              label="Acceptance rate"
              value={`${profile.acceptanceRate}%`}
              note="accepted ÷ all submissions"
            />
            <Stat label="Submissions" value={profile.totalSubmissions} />
          </section>

          <section className="surface mt-4 p-5">
            <div className="mb-3">
              <h2 className="text-[18px]">Consistency</h2>
              {/* The concept is explicit that a bad week is data rather than
                  a punishment, so this shows volume over the year and
                  deliberately never computes a streak there is pressure to
                  keep alive. */}
              <p className="text-[12px] text-[var(--ink-muted)]">
                A year of submissions. No streak counter — a quiet week is information, not a
                failure.
              </p>
            </div>
            <Heatmap entries={profile.heatmap} />
          </section>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="surface p-5">
              <h2 className="text-[18px]">How you fail</h2>
              <p className="mb-4 text-[12px] text-[var(--ink-muted)]">
                Across your last {recentTotal} submission{recentTotal === 1 ? "" : "s"}.
              </p>
              {verdictRows.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-muted)]">
                  Nothing submitted yet.{" "}
                  <Link to="/problems" className="text-[var(--accent)] underline underline-offset-4">
                    Pick a problem
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {verdictRows.map(([verdict, count]) => (
                    <div key={verdict} className="flex items-center gap-3">
                      <VerdictBadge verdict={verdict} size="sm" />
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${(count / recentTotal) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[12px] tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="surface p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-[18px]">Recent</h2>
                <Link
                  to="/submissions"
                  className="text-[12px] text-[var(--accent)] underline underline-offset-4"
                >
                  All submissions
                </Link>
              </div>
              {recent && recent.items.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {recent.items.slice(0, 6).map((submission) => (
                    <Link
                      key={submission.id}
                      to={`/submissions/${submission.id}`}
                      className="flex items-center gap-3 text-[13px] hover:text-[var(--accent)]"
                    >
                      <span className="min-w-0 flex-1 truncate">{submission.problemTitle}</span>
                      <span className="text-[11px] text-[var(--ink-muted)]">
                        {LANGUAGE_LABELS[submission.language]}
                      </span>
                      <VerdictBadge verdict={submission.verdict} size="sm" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--ink-muted)]">No submissions yet.</p>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
