import type { Difficulty } from "@online-judge/shared";

// Sage for easy, terracotta for medium, deep terracotta for hard — one
// palette walked in intensity rather than three unrelated hues, so
// difficulty reads as a scale instead of a category.
const STYLES: Record<Difficulty, string> = {
  EASY: "bg-[var(--second-tint)] text-[var(--second-ink)]",
  MEDIUM: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  HARD: "bg-[var(--danger-tint)] text-[var(--danger-ink)]",
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STYLES[difficulty]}`}
    >
      {difficulty[0] + difficulty.slice(1).toLowerCase()}
    </span>
  );
}
