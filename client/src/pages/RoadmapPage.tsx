import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { MasteryLevel } from "@online-judge/shared";
import { fetchConceptRoute, fetchRoadmap } from "../api/roadmap";
import ConceptGraph from "../components/roadmap/ConceptGraph";
import { ButtonLink } from "../components/ui/Button";
import { Select } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

const LEGEND: { level: MasteryLevel; label: string; swatch: string }[] = [
  { level: "mastered", label: "mastered", swatch: "bg-[var(--second)]" },
  { level: "solid", label: "solid", swatch: "bg-[var(--accent)]" },
  { level: "shaky", label: "shaky", swatch: "bg-[var(--accent-tint)]" },
  {
    level: "unseen",
    label: "unseen",
    swatch: "border border-dashed border-[var(--edge)]",
  },
];

function MasteryWord({ level }: { level: MasteryLevel }) {
  const tone =
    level === "mastered"
      ? "text-[var(--second-ink)]"
      : level === "unseen"
        ? "text-[var(--ink-muted)]"
        : "text-[var(--accent-ink)]";
  return <span className={`text-[11px] tracking-[0.06em] uppercase ${tone}`}>{level}</span>;
}

export default function RoadmapPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<string>("");

  const { data: roadmap, isPending } = useQuery({
    queryKey: ["roadmap"],
    queryFn: fetchRoadmap,
  });

  const { data: route } = useQuery({
    queryKey: ["roadmap-route", target],
    queryFn: () => fetchConceptRoute(target),
    enabled: !!target,
  });

  if (isPending) return <p className="p-8 text-[var(--ink-muted)]">Loading…</p>;
  if (!roadmap) return <p className="p-8 text-[var(--danger-ink)]">Couldn&apos;t load the graph.</p>;

  const selectedConcept = roadmap.concepts.find((c) => c.slug === selected);
  const routeSlugs = route?.steps.map((s) => s.slug) ?? [];
  // Deepest concepts make the most interesting destinations, so they lead
  // the picker rather than being buried alphabetically.
  const targets = [...roadmap.concepts].sort(
    (a, b) => b.depth - a.depth || a.name.localeCompare(b.name),
  );

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="max-w-2xl">
        <h1 className="text-4xl">Roadmap as a graph</h1>
        <p className="mt-2 text-[14px] text-[var(--ink-muted)]">
          A curriculum is a directed graph, and the useful question isn&apos;t &ldquo;what&apos;s
          next&rdquo; — it&apos;s what stands between you and a particular idea. Node fill is what
          you&apos;ve demonstrated, so the route is computed against your solves rather than a
          fixed chapter order.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-[var(--ink-muted)]">route to</label>
          <Select value={target} onChange={(e) => setTarget(e.target.value)} className="w-56">
            <option value="">— pick a destination —</option>
            {targets.map((concept) => (
              <option key={concept.slug} value={concept.slug}>
                {concept.name}
              </option>
            ))}
          </Select>
        </div>

        {route && (
          <span className="text-[13px]">
            {route.steps.length} {route.steps.length === 1 ? "step" : "steps"} left
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-[var(--ink-muted)]">
          {LEGEND.map((item) => (
            <span key={item.level} className="flex items-center gap-1.5">
              <span className={`inline-block size-3 rounded-full ${item.swatch}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[12px] text-[var(--ink-muted)]">
        {roadmap.concepts.length} concepts · {roadmap.demonstratedCount} demonstrated
        {!user && " · sign in to fill the graph in against your own solves"}
      </p>

      <div className="surface hairline mt-4 p-2">
        <ConceptGraph
          concepts={roadmap.concepts}
          selected={selected}
          onSelect={setSelected}
          routeSlugs={routeSlugs}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          {selectedConcept ? (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-[20px]">{selectedConcept.name}</h2>
                <MasteryWord level={selectedConcept.mastery} />
              </div>
              <p className="mt-1 text-[13px] text-[var(--ink-muted)]">{selectedConcept.blurb}</p>

              <dl className="mt-4 flex flex-col gap-1.5 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--ink-muted)]">Demonstrated</dt>
                  <dd className="tabular-nums">
                    {selectedConcept.solved === 0
                      ? "never"
                      : `${selectedConcept.solved} ${selectedConcept.solved === 1 ? "solve" : "solves"}`}
                  </dd>
                </div>
                {selectedConcept.recall !== null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--ink-muted)]">Recall estimate</dt>
                    <dd className="tabular-nums">{selectedConcept.recall}%</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--ink-muted)]">Problems that teach it</dt>
                  <dd className="tabular-nums">{selectedConcept.available}</dd>
                </div>
                {selectedConcept.requires.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--ink-muted)]">Requires</dt>
                    <dd className="text-right">{selectedConcept.requires.join(", ")}</dd>
                  </div>
                )}
              </dl>

              {selectedConcept.available > 0 ? (
                <ButtonLink
                  to={`/problems?tag=${encodeURIComponent(selectedConcept.slug)}`}
                  size="sm"
                  className="mt-4"
                >
                  Practise this
                </ButtonLink>
              ) : (
                <p className="mt-4 text-[12px] text-[var(--ink-muted)]">
                  No problem in the catalogue carries this tag yet, so there&apos;s nothing to
                  practise it with.
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[var(--ink-muted)]">
              Select a concept in the graph for its detail.
            </p>
          )}
        </section>

        <section className="surface p-5">
          <h2 className="text-[20px]">The route</h2>
          {!route ? (
            <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
              Pick a destination and the graph shows what&apos;s between you and it — skipping
              anything you&apos;ve already demonstrated.
            </p>
          ) : route.steps.length === 0 ? (
            <p className="mt-1 text-[13px]">Nothing in the way. You&apos;ve demonstrated it all.</p>
          ) : (
            <>
              <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
                {route.steps.length} to go, prerequisites first.
              </p>
              <ol className="mt-3 flex flex-col gap-1.5">
                {route.steps.map((step, index) => (
                  <li key={step.slug} className="flex items-center gap-3 text-[13px]">
                    <span className="w-5 text-right text-[var(--ink-muted)] tabular-nums">
                      {index + 1}
                    </span>
                    <button
                      onClick={() => setSelected(step.slug)}
                      className="text-left hover:text-[var(--accent)]"
                    >
                      {step.name}
                    </button>
                    <span className="ml-auto flex items-center gap-2">
                      {step.available === 0 && (
                        <span className="text-[11px] text-[var(--ink-muted)]">no problems yet</span>
                      )}
                      <MasteryWord level={step.mastery} />
                    </span>
                  </li>
                ))}
              </ol>
              {route.unreachable.length > 0 && (
                <p className="mt-4 text-[12px] text-[var(--ink-muted)]">
                  {route.unreachable.length} of these have no problems in the catalogue yet. The
                  route names them rather than pretending the path is clear.
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <p className="mt-6 text-[12px] text-[var(--ink-muted)]">
        Mastery decays: a concept&apos;s recall halves every 90 days since you last demonstrated
        it, so the graph reflects what you could do now rather than what you once did.{" "}
        <Link to="/analytics" className="text-[var(--accent)] underline underline-offset-4">
          Your analytics
        </Link>{" "}
        applies the same idea to tags.
      </p>
    </main>
  );
}
