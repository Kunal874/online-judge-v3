import type { Language } from "@online-judge/shared";
import { LANGUAGE_LABELS } from "../../lib/languageStubs";

/**
 * A segmented control rather than a dropdown. There are only four options
 * and switching is frequent while solving, so hiding them behind a menu
 * costs a click every time for no gain in space.
 */
export default function LanguagePicker({
  value,
  onChange,
  languages,
}: {
  value: Language;
  onChange: (language: Language) => void;
  languages: readonly Language[];
}) {
  return (
    <div className="hairline inline-flex shrink-0 self-start overflow-hidden rounded-full">
      {languages.map((language) => {
        const isActive = language === value;
        return (
          <button
            key={language}
            onClick={() => onChange(language)}
            aria-pressed={isActive}
            className={`px-4 py-1.5 text-[13px] transition-colors ${
              isActive
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--ink-muted)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            {LANGUAGE_LABELS[language]}
          </button>
        );
      })}
    </div>
  );
}
