/**
 * Marks a panel whose numbers are illustrative rather than measured.
 *
 * Some of the design's panels depend on data this judge doesn't collect yet
 * — a rating system, per-solve hint usage, a classifier that can say a wrong
 * answer failed "on the boundary". Those panels are built so the screen
 * reads as intended, but an unlabelled invented statistic is indistinguishable
 * from a real one, which is exactly how someone ends up trusting a number
 * nothing produced. Hence the label, on the panel, every time.
 */
export default function DemoNotice({ needs }: { needs: string }) {
  return (
    <span
      title={`Sample figures. Real values need ${needs}.`}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[var(--edge)] px-2 py-0.5 text-[10px] tracking-[0.06em] text-[var(--ink-muted)] uppercase"
    >
      sample data
    </span>
  );
}
