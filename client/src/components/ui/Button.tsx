import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-heading transition-colors " +
  "disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap";

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-5 py-2.5 text-sm",
};

// Every variant carries its own hover and pressed state from the accent
// ramp — the system's rule is that no interactive element is ever left on
// browser defaults.
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] active:brightness-95",
  secondary:
    "border border-[var(--edge)] text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] " +
    "active:bg-[color-mix(in_srgb,var(--ink)_14%,transparent)]",
  ghost:
    "text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] " +
    "active:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]",
  danger:
    "bg-[var(--danger)] text-white hover:brightness-110 active:brightness-95",
};

function classesFor(variant: Variant, size: Size, className?: string) {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className ?? ""}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={classesFor(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

/** Same shape as Button, but navigates. Keeps links and actions visually identical. */
export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={classesFor(variant, size, className)}>
      {children}
    </Link>
  );
}
