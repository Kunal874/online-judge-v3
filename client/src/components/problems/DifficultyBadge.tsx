import type { Difficulty } from "@online-judge/shared";

const STYLES: Record<Difficulty, string> = {
  EASY: "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40",
  MEDIUM: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  HARD: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40",
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STYLES[difficulty]}`}>
      {difficulty[0] + difficulty.slice(1).toLowerCase()}
    </span>
  );
}
