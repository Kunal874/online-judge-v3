import type { ReactNode } from "react";

export interface TabDef<T extends string> {
  id: T;
  label: string;
  /** Rendered after the label — a count, a verdict dot, anything small. */
  badge?: ReactNode;
}

/**
 * A row of tabs sharing one underline rail. Used for the workspace result
 * panel, where the whole point is that switching views never moves the
 * content underneath — so the rail is fixed and only the panel below swaps.
 */
export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex shrink-0 items-center gap-1 border-b border-[var(--edge)] px-2"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors ${
              isActive
                ? "border-[var(--accent)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {tab.label}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
