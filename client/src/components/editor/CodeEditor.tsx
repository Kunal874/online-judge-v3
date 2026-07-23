import Editor from "@monaco-editor/react";
import type { Language } from "@online-judge/shared";

const MONACO_LANGUAGE: Record<Language, string> = {
  CPP: "cpp",
  C: "c",
  JAVA: "java",
  PYTHON: "python",
};

const prefersDark =
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

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
  return (
    <Editor
      height="400px"
      language={MONACO_LANGUAGE[language]}
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      theme={prefersDark ? "vs-dark" : "light"}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        readOnly,
      }}
    />
  );
}
