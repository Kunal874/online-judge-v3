import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { Language } from "@online-judge/shared";
import { useDarkMode } from "../../hooks/useDarkMode";

const MONACO_LANGUAGE: Record<Language, string> = {
  CPP: "cpp",
  C: "c",
  JAVA: "java",
  PYTHON: "python",
};

export default function CodeEditor({
  language,
  value,
  onChange,
  readOnly = false,
}: {
  language: Language;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  // Follows the app's own toggle rather than the OS preference: a light
  // editor inside a dark page (or the reverse) is jarring, and the toggle is
  // the setting the user actually reached for.
  const { isDark } = useDarkMode();

  // Monaco is measured here rather than given height="100%".
  //
  // A percentage height makes Monaco size itself from whatever the flex
  // container measured at the instant it mounted, which inside a
  // still-settling layout is nearly zero — the editor renders about 5px tall
  // and only recovers if something later happens to resize it. Observing the
  // box and handing Monaco an explicit pixel height makes that deterministic.
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const apply = () => setHeight(element.getBoundingClientRect().height);
    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <Editor
        height={height || 300}
        language={MONACO_LANGUAGE[language]}
        value={value}
        onChange={(v) => onChange?.(v ?? "")}
        theme={isDark ? "vs-dark" : "light"}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          readOnly,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "gutter",
          smoothScrolling: true,
        }}
      />
    </div>
  );
}
