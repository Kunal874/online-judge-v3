import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const FIELD =
  "min-h-9 rounded-full bg-[var(--surface)] px-4 py-1.5 text-[14px] text-[var(--ink)] " +
  "border border-[var(--edge)] transition-colors " +
  "hover:border-[color-mix(in_srgb,var(--ink)_40%,transparent)] " +
  "focus-visible:border-[var(--accent)] placeholder:text-[var(--ink-muted)]";

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD} ${className ?? ""}`} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${FIELD} ${className ?? ""}`} {...rest}>
      {children}
    </select>
  );
}

/** A label above its control, with the hint or error slot the forms use. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] text-[var(--ink-muted)]">{label}</label>
      {children}
      {/* The hint stays until a real error replaces it, so the rules are
          known before submitting rather than after. */}
      {error ? (
        <p className="text-[11px] text-[var(--danger-ink)]">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-[var(--ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
