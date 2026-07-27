import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { Analytics } from "@online-judge/shared";
import { fetchMyAnalytics } from "../api/users";
import VerdictBadge from "../components/submissions/VerdictBadge";
import DemoNotice from "../components/ui/DemoNotice";

// The design's four questions. The first two are answerable from submission
// history; the last two need data this judge doesn't collect yet, and are
// labelled rather than faked into looking measured.
const QUESTIONS = [
  { q: "Why do I fail?", answered: true },
  { q: "How long do I take?", answered: true },
  { q: "How far from optimal am I?", answered: false },
  { q: "What have I lost since I last looked?", answered: false },
];

function Panel({
  title,
  subtitle,
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-6">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-[20px]">{title}</h2>
        {aside}
      </div>
      {subtitle && <p className="mb-4 text-[12px] text-[var(--ink-muted)]">{subtitle}</p>}
      {children}
    </section>
  );
}

function WhyYouFail({ analytics }: { analytics: Analytics }) {
  if (analytics.failures.length === 0) {
    return (
      <p className="text-[13px] text-[var(--ink-muted)]">
        Nothing has failed in the last {analytics.windowDays} days — either you&apos;re on a good
        run, or there isn&apos;t much history yet.
      </p>
    );
  }

  const top = analytics.failures[0]!;
  const topTwoShare = analytics.failures.slice(0, 2).reduce((sum, f) => sum + f.share, 0);

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {analytics.failures.map((failure) => (
          <div key={failure.verdict} className="flex items-center gap-3">
            <div className="w-40 shrink-0">
              <VerdictBadge verdict={failure.verdict} size="sm" />
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${failure.share}%` }}
              />
            </div>
            <span className="w-16 text-right text-[12px] tabular-nums">
              {failure.share}%
              <span className="ml-1 text-[var(--ink-muted)]">({failure.count})</span>
            </span>
          </div>
        ))}
      </div>
      {/* The design's whole argument in one line: the shape of your failures
          is narrower than the topic list you'd otherwise go practise. */}
      <p className="mt-4 text-[13px]">
        {analytics.failures.length >= 2 ? (
          <>
            {Math.round(topTwoShare)}% of your failures are two modes, not{" "}
            {analytics.failures.length}. Practising &ldquo;more topics&rdquo; wouldn&apos;t have
            moved either.
          </>
        ) : (
          <>Every failure in this window was the same verdict: {top.verdict.replace(/_/g, " ")}.</>
        )}
      </p>
    </>
  );
}

function TimeToFirstAc({ analytics }: { analytics: Analytics }) {
  const max = Math.max(1, ...analytics.timeToFirstAcBuckets.map((b) => b.count));

  return (
    <>
      <div className="flex h-32 items-end gap-2">
        {analytics.timeToFirstAcBuckets.map((bucket) => (
          <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] tabular-nums">{bucket.count || ""}</span>
            <div
              className="w-full rounded-t-lg bg-[var(--accent)]"
              style={{ height: `${(bucket.count / max) * 100}%`, minHeight: bucket.count ? 4 : 0 }}
            />
            <span className="text-[10px] text-[var(--ink-muted)]">{bucket.label}</span>
          </div>
        ))}
      </div>

      {analytics.longTail.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px]">
            The tail past an hour is where learning stops and stubbornness starts.
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {analytics.longTail.map((problem) => (
              <Link
                key={problem.slug}
                to={`/problems/${problem.slug}`}
                className="flex items-baseline gap-3 text-[13px] hover:text-[var(--accent)]"
              >
                <span className="min-w-0 truncate">{problem.title}</span>
                <span className="ml-auto text-[12px] text-[var(--ink-muted)] tabular-nums">
                  {problem.minutes} min
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function TagMastery({ analytics }: { analytics: Analytics }) {
  if (analytics.tagMastery.length === 0) {
    return <p className="text-[13px] text-[var(--ink-muted)]">Solve something to populate this.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {analytics.tagMastery.map((tag) => (
        <div key={tag.tag} className="flex items-center gap-3 text-[13px]">
          <span className="w-40 shrink-0 truncate">{tag.tag}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
            <div
              className="h-full rounded-full bg-[var(--second)]"
              style={{ width: `${tag.recencyWeighted}%` }}
            />
          </div>
          <span className="w-20 text-right text-[12px] text-[var(--ink-muted)] tabular-nums">
            {tag.solved} solved
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const {
    data: analytics,
    isPending,
    isError,
  } = useQuery({ queryKey: ["analytics"], queryFn: fetchMyAnalytics });

  if (isPending) return <p className="p-8 text-[var(--ink-muted)]">Loading…</p>;
  if (isError || !analytics)
    return <p className="p-8 text-[var(--danger-ink)]">Couldn&apos;t load your analytics.</p>;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-14">
      <header className="mb-2">
        <h1 className="text-4xl">Progress analytics</h1>
        <p className="mt-2 max-w-xl text-[14px] text-[var(--ink-muted)]">
          The private page: diagnostics, not trophies. Four questions no judge usually answers —
          two of them this one can, from your last {analytics.windowDays} days.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
          {QUESTIONS.map((item) => (
            <li
              key={item.q}
              className={item.answered ? "text-[var(--ink)]" : "text-[var(--ink-muted)] line-through"}
            >
              {item.q}
            </li>
          ))}
        </ul>
      </header>

      <Panel
        title="Why you fail"
        subtitle={`Every rejected submission of the last ${analytics.windowDays} days, by verdict.`}
      >
        <WhyYouFail analytics={analytics} />
      </Panel>

      <Panel
        title="Time to first AC"
        subtitle={
          analytics.timeToFirstAcMedianMinutes != null
            ? `Median ${analytics.timeToFirstAcMedianMinutes} min, from your first attempt at a problem to the one that passed.`
            : "Nothing solved yet, so there's no time to measure."
        }
      >
        <TimeToFirstAc analytics={analytics} />
      </Panel>

      <Panel
        title="Tag mastery"
        subtitle="Recency-weighted: a solve's weight halves every four months, so this decays if you stop."
      >
        <TagMastery analytics={analytics} />
      </Panel>

      <Panel
        title="Distance from optimal"
        subtitle="How far your accepted runtime sits from the best solution to the same problem."
        aside={<DemoNotice needs="per-problem reference solutions to compare against" />}
      >
        <p className="text-[13px] text-[var(--ink-muted)]">
          Not built. It needs a reference solution stored per problem to measure against, which
          this judge doesn&apos;t keep — so rather than invent a percentage, the panel says so.
        </p>
      </Panel>

      <p className="mt-2 text-[12px] text-[var(--ink-muted)]">
        Everything above except the last panel is computed from your own submissions. Nothing here
        is a target to hit; a quiet week just means less data.
      </p>
    </main>
  );
}
