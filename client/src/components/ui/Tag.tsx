import type { ReactNode } from "react";

type Tone = "accent" | "second" | "neutral" | "danger" | "outline";

const TONES: Record<Tone, string> = {
  accent: "bg-[var(--accent-tint)] text-[var(--accent-ink)]",
  second: "bg-[var(--second-tint)] text-[var(--second-ink)]",
  neutral: "bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-[var(--ink-muted)]",
  danger: "bg-[var(--danger-tint)] text-[var(--danger-ink)]",
  outline: "border border-[var(--accent)] text-[var(--accent)]",
};

export default function Tag({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] tracking-[0.02em] ${TONES[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
