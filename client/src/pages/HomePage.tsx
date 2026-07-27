import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ButtonLink } from "../components/ui/Button";

// Deliberately not a feature grid. Each of these is a claim about how the
// judge behaves, phrased as the thing a solver actually experiences.
const CLAIMS = [
  {
    kicker: "The tests you can't see",
    title: "Samples are the easy half",
    body: "Most cases stay hidden, and the big ones are sized so a slow-but-correct solution fails on time rather than on logic. Passing locally proves less than you'd like.",
  },
  {
    kicker: "The sandbox",
    title: "Your code runs in a locked room",
    body: "Every submission executes in a throwaway container with no network, a read-only filesystem, a memory ceiling and a process cap. Nothing you write can reach anything else.",
  },
  {
    kicker: "Contests",
    title: "Ranked on solves, split on penalty",
    body: "ICPC scoring: problems solved first, time and rejected attempts as the tiebreak. Unsolved problems cost nothing, so there's no reason not to try one.",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    // Left-aligned and asymmetric, per the system: content hugs the left
    // edge with the whitespace kept on the right.
    <main className="mx-auto max-w-4xl px-5 py-20">
      <section className="max-w-2xl">
        <p className="mb-4 text-[11px] tracking-[0.14em] text-[var(--accent)] uppercase">
          C · C++ · Java · Python
        </p>
        <h1 className="text-5xl leading-[1.05] sm:text-6xl">
          You don&apos;t need more problems. You need to know why you failed.
        </h1>
        <p className="mt-5 text-[16px] text-[var(--ink-muted)]">
          Write a solution, run it against your own input, then submit it to a sandbox that tells
          you which case broke and how close you were — without handing you the answer.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <ButtonLink to="/problems">Start solving</ButtonLink>
          {user ? (
            <ButtonLink to="/profile" variant="secondary">
              Your activity
            </ButtonLink>
          ) : (
            <ButtonLink to="/register" variant="secondary">
              Create an account
            </ButtonLink>
          )}
          <Link
            to="/contests"
            className="text-[13px] text-[var(--ink-muted)] underline underline-offset-4 hover:text-[var(--ink)]"
          >
            or look at contests
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        {CLAIMS.map((claim) => (
          <article key={claim.title} className="surface flex flex-col gap-2 p-5">
            <p className="text-[10px] tracking-[0.1em] text-[var(--accent)] uppercase">
              {claim.kicker}
            </p>
            <h2 className="text-[18px]">{claim.title}</h2>
            <p className="text-[13px] text-[var(--ink-muted)]">{claim.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
