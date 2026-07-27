import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { TagStrength, UserProfile } from "@online-judge/shared";
import { useAuth } from "../context/AuthContext";
import { fetchUserProfile } from "../api/users";
import Heatmap from "../components/profile/Heatmap";
import DemoNotice from "../components/ui/DemoNotice";
import { ButtonLink } from "../components/ui/Button";

const RATING_DEMO = { current: 1642, peak: 1658, band: 5, bands: 9 };

function SectionLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-[10px] tracking-[0.12em] text-[var(--ink-muted)] uppercase">
        {children}
      </h2>
      {aside}
    </div>
  );
}

/**
 * How a strength was established, in the design's own framing: the claim is
 * worthless without the evidence beside it, so the evidence is the line.
 */
function strengthEvidence(strength: TagStrength): string {
  const parts = [`${strength.solved} solved`];
  if (strength.firstTry > 0) parts.push(`${strength.firstTry} first try`);
  if (strength.medianRuntimeMs != null) parts.push(`median ${strength.medianRuntimeMs} ms`);
  return parts.join(" · ");
}

/** Emerging vs established, from the evidence rather than from a badge. */
function strengthTier(strength: TagStrength): "Signature" | "Solid" | "Emerging" {
  if (strength.solved >= 5 && strength.firstTry * 2 >= strength.solved) return "Signature";
  if (strength.solved >= 3) return "Solid";
  return "Emerging";
}

function DifficultyBar({ profile }: { profile: UserProfile }) {
  return (
    <div className="flex flex-col gap-2">
      {profile.byDifficulty.map((row) => {
        const pct = row.available > 0 ? (row.solved / row.available) * 100 : 0;
        return (
          <div key={row.difficulty} className="flex items-center gap-3 text-[13px]">
            <span className="w-16 text-[var(--ink-muted)] capitalize">
              {row.difficulty.toLowerCase()}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-14 text-right tabular-nums">
              {row.solved}
              <span className="text-[var(--ink-muted)]">/{row.available}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { handle: routeHandle } = useParams<{ handle?: string }>();
  // Falls back to the signed-in user, so /profile and /u/:handle are the
  // same page — the public artefact is what you see of yourself too.
  const handle = routeHandle ?? user?.handle;
  const isOwnProfile = !!user && handle === user.handle;

  const {
    data: profile,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["profile", handle],
    queryFn: () => fetchUserProfile(handle!),
    enabled: !!handle,
  });

  if (!handle) return <p className="p-8 text-[var(--ink-muted)]">No profile to show.</p>;
  if (isPending) return <p className="p-8 text-[var(--ink-muted)]">Loading…</p>;
  if (isError || !profile)
    return <p className="p-8 text-[var(--danger-ink)]">No such profile.</p>;

  const joined = new Date(profile.joinedAt).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    // Set like a printed page: generous measure, left-aligned, no chrome.
    // The design's point is that this is the artefact someone links in a job
    // application, not a dashboard.
    <main className="mx-auto max-w-3xl px-5 py-16">
      <header className="flex flex-wrap items-start gap-5">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--accent)] font-heading text-[22px] text-[var(--accent-contrast)] uppercase">
          {profile.handle.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl">{profile.handle}</h1>
          <p className="mt-1 text-[14px] text-[var(--ink-muted)]">{profile.name}</p>
          <p className="mt-2 text-[12px] text-[var(--ink-muted)]">
            joined {joined} <span className="opacity-40">/</span> {profile.solvedCount} solved{" "}
            <span className="opacity-40">/</span> {profile.acceptanceRate}% accepted
          </p>
        </div>
        {isOwnProfile && (
          <ButtonLink to="/analytics" variant="secondary" size="sm">
            Your analytics
          </ButtonLink>
        )}
      </header>

      <section className="mt-12">
        <SectionLabel aside={<DemoNotice needs="a rated-contest system" />}>
          Rating · {RATING_DEMO.bands} bands
        </SectionLabel>
        <div className="flex items-baseline gap-4">
          <span className="font-heading text-5xl tabular-nums">{RATING_DEMO.current}</span>
          <span className="text-[13px] text-[var(--ink-muted)]">
            peak {RATING_DEMO.peak} · band {RATING_DEMO.band} of {RATING_DEMO.bands}
          </span>
        </div>
        <p className="mt-2 text-[12px] text-[var(--ink-muted)]">
          Illustrative. Contests here aren&apos;t rated yet, so there is no real number to show —
          the figures above are from the design mockup, not from your account.
        </p>
      </section>

      <section className="mt-12">
        <SectionLabel>Signature strengths · demonstrated, not claimed</SectionLabel>
        {profile.strengths.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-muted)]">
            Nothing demonstrated yet.{" "}
            <Link to="/problems" className="text-[var(--accent)] underline underline-offset-4">
              Solve something
            </Link>{" "}
            and the tags you prove show up here.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--edge)]">
            {profile.strengths.slice(0, 8).map((strength) => (
              <div key={strength.tag} className="flex flex-wrap items-baseline gap-x-3 py-3">
                <span className="text-[17px]">{strength.tag}</span>
                <span className="text-[11px] tracking-[0.06em] text-[var(--accent)] uppercase">
                  {strengthTier(strength)}
                </span>
                <span className="ml-auto text-[12px] text-[var(--ink-muted)] tabular-nums">
                  {strengthEvidence(strength)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionLabel>Solves by difficulty</SectionLabel>
        <DifficultyBar profile={profile} />
      </section>

      <section className="mt-12">
        <SectionLabel>Activity · last year</SectionLabel>
        <Heatmap entries={profile.heatmap} />
      </section>

      <section className="mt-12">
        <SectionLabel>Verified contest history</SectionLabel>
        {profile.contests.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-muted)]">
            No contests entered yet.{" "}
            <Link to="/contests" className="text-[var(--accent)] underline underline-offset-4">
              See what&apos;s running
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--edge)]">
            {profile.contests.map((contest) => (
              <Link
                key={contest.slug}
                to={`/contests/${contest.slug}/leaderboard`}
                className="flex flex-wrap items-baseline gap-x-3 py-3 text-[14px] hover:text-[var(--accent)]"
              >
                <span>{contest.title}</span>
                <span className="text-[12px] text-[var(--ink-muted)]">
                  {new Date(contest.endsAt).toLocaleDateString()}
                </span>
                <span className="ml-auto text-[12px] tabular-nums">
                  {contest.solved}/{contest.problemCount} solved
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-14 border-t border-[var(--edge)] pt-5 text-[12px] text-[var(--ink-muted)]">
        No badges. No streak. Nothing here rewards showing up — only what you can demonstrate.
      </p>
    </main>
  );
}
