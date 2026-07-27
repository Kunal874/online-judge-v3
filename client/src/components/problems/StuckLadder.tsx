import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StuckLadder as Ladder } from "@online-judge/shared";
import { fetchHints, revealNextHint } from "../../api/hints";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";

export default function StuckLadder({ slug }: { slug: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ladder } = useQuery({
    queryKey: ["hints", slug],
    queryFn: () => fetchHints(slug),
  });

  const reveal = useMutation({
    mutationFn: () => revealNextHint(slug),
    onSuccess: (next: Ladder) => queryClient.setQueryData(["hints", slug], next),
  });

  if (!ladder || ladder.total === 0) return null;

  const allOpen = ladder.revealedCount >= ladder.total;
  const nextLabel = ladder.rungs.find((rung) => !rung.revealed)?.label;

  return (
    <section className="surface-raised mt-2 p-5">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[18px]">Stuck ladder</h2>
        {/* The design's phrasing, and it's literally true: the reveal is
            recorded, but nothing is deducted for asking. */}
        <p className="text-[12px] text-[var(--ink-muted)]">Costs nothing. It&apos;s logged, not charged.</p>
        <span className="ml-auto text-[11px] text-[var(--ink-muted)] tabular-nums">
          {ladder.revealedCount} / {ladder.total} shown
        </span>
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {ladder.rungs.map((rung) => (
          <li
            key={rung.orderIndex}
            className={`rounded-2xl px-4 py-3 ${
              rung.revealed
                ? "bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
                : "border border-dashed border-[var(--edge)]"
            }`}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] tracking-[0.06em] text-[var(--accent)] uppercase">
                Rung {rung.orderIndex + 1} · {rung.label}
              </span>
            </div>
            {rung.revealed ? (
              <p className="mt-1.5 text-[13px]">{rung.body}</p>
            ) : (
              <p className="mt-1.5 text-[13px] text-[var(--ink-muted)] italic">Not opened.</p>
            )}
          </li>
        ))}
      </ol>

      {!allOpen &&
        (user ? (
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            disabled={reveal.isPending}
            onClick={() => reveal.mutate()}
          >
            {reveal.isPending ? "Opening…" : `Reveal the next rung · ${nextLabel}`}
          </Button>
        ) : (
          <p className="mt-4 text-[12px] text-[var(--ink-muted)]">
            Log in to open a rung — reveals are recorded against your account.
          </p>
        ))}

      {allOpen && (
        <p className="mt-4 text-[12px] text-[var(--ink-muted)]">
          Every rung is open. Tags stay hidden until you solve it — naming the technique yourself
          is the exercise.
        </p>
      )}
    </section>
  );
}
