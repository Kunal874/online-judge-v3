import type { Language } from "@online-judge/shared";

export const LANGUAGE_LABELS: Record<Language, string> = {
  CPP: "C++",
  C: "C",
  JAVA: "Java",
  PYTHON: "Python",
};

export const LANGUAGE_STUBS: Record<Language, string> = {
  CPP: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  C: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  JAVA: 'public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  PYTHON: "\n",
};
