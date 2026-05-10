import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

// ─── Theme registration ───────────────────────────────────────────────────────

let themesRegistered = false;

function registerThemes(monaco) {
  if (themesRegistered) return;
  themesRegistered = true;

  monaco.editor.defineTheme("algo-arena-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "bd93f9", fontStyle: "bold" },
      { token: "string", foreground: "ff6090" },
      { token: "string.escape", foreground: "ff6090" },
      { token: "variable", foreground: "8be9fd" },
      { token: "identifier", foreground: "8be9fd" },
      { token: "type", foreground: "f1fa8c" },
      { token: "type.identifier", foreground: "f1fa8c" },
      { token: "function", foreground: "50fa7b" },
      { token: "comment", foreground: "6272a4", fontStyle: "italic" },
      { token: "comment.doc", foreground: "6272a4", fontStyle: "italic" },
      { token: "number", foreground: "ffb86c" },
      { token: "number.float", foreground: "ffb86c" },
      { token: "number.hex", foreground: "ffb86c" },
      { token: "operator", foreground: "44adff" },
      { token: "delimiter", foreground: "f8f8f2" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#f8f8f2",
      "editorLineNumber.foreground": "#4b5563",
      "editorLineNumber.activeForeground": "#9ca3af",
      "editorCursor.foreground": "#ff6090",
      "editor.selectionBackground": "#3a3f5c",
      "editor.inactiveSelectionBackground": "#2a2f4c",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorGutter.background": "#0d1117",
      "editorIndentGuide.background1": "#ffffff10",
      "editorIndentGuide.activeBackground1": "#ffffff25",
      "editorError.foreground": "#ff5555",
      "editorWarning.foreground": "#ffb86c",
      "editorInfo.foreground": "#8be9fd",
      "editorError.border": "#ff555500",
      "scrollbarSlider.background": "#ffffff15",
      "scrollbarSlider.hoverBackground": "#ffffff25",
      "scrollbarSlider.activeBackground": "#ffffff35",
    },
  });

  monaco.editor.defineTheme("algo-arena-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "d73a49", fontStyle: "bold" },
      { token: "string", foreground: "005cc5" },
      { token: "string.escape", foreground: "005cc5" },
      { token: "variable", foreground: "24292e" },
      { token: "identifier", foreground: "24292e" },
      { token: "type", foreground: "6f42c1" },
      { token: "type.identifier", foreground: "6f42c1" },
      { token: "function", foreground: "6f42c1" },
      { token: "comment", foreground: "6a737d", fontStyle: "italic" },
      { token: "comment.doc", foreground: "6a737d", fontStyle: "italic" },
      { token: "number", foreground: "e36209" },
      { token: "number.float", foreground: "e36209" },
      { token: "operator", foreground: "005cc5" },
      { token: "delimiter", foreground: "24292e" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#24292e",
      "editorLineNumber.foreground": "#afb8c1",
      "editorLineNumber.activeForeground": "#57606a",
      "editorCursor.foreground": "#d73a49",
      "editor.selectionBackground": "#add6ff",
      "editor.inactiveSelectionBackground": "#c8e6ff",
      "editor.lineHighlightBackground": "#f6f8fa",
      "editorGutter.background": "#f6f8fa",
      "editorGutter.border": "#d0d7de",
      "editorError.foreground": "#cb2431",
      "editorWarning.foreground": "#e36209",
      "editorInfo.foreground": "#005cc5",
      "scrollbarSlider.background": "#00000015",
      "scrollbarSlider.hoverBackground": "#00000025",
      "scrollbarSlider.activeBackground": "#00000035",
    },
  });
}

// ─── Bracket / syntax validator for Python, Java, C++ ────────────────────────

const VALIDATOR_OWNER = "arena-validator";
const CLOSE_TO_OPEN = { ")": "(", "}": "{", "]": "[" };

// Walk through code, skip strings and comments, return bracket tokens only.
// Handles Python (#, triple-quoted strings) and Java/C++ (// block comments, strings, char literals).
function extractBracketTokens(code, language) {
  const tokens = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    const ch = code[i];

    // ── Skip Python single-line comment
    if (language === "python" && ch === "#") {
      while (i < len && code[i] !== "\n") i++;
      continue;
    }

    // ── Skip C++/Java single-line comment
    if (language !== "python" && ch === "/" && code[i + 1] === "/") {
      while (i < len && code[i] !== "\n") i++;
      continue;
    }

    // ── Skip C++/Java block comment
    if (language !== "python" && ch === "/" && code[i + 1] === "*") {
      i += 2;
      while (i < len - 1 && !(code[i] === "*" && code[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // ── Skip Python triple-quoted strings
    if (
      language === "python" &&
      (ch === '"' || ch === "'") &&
      code[i + 1] === ch &&
      code[i + 2] === ch
    ) {
      const triple = ch + ch + ch;
      i += 3;
      while (i < len - 2 && code.slice(i, i + 3) !== triple) i++;
      i += 3;
      continue;
    }

    // ── Skip regular strings / char literals
    if (ch === '"' || (ch === "'" && language !== "python")) {
      const q = ch;
      i++;
      while (i < len && code[i] !== q && code[i] !== "\n") {
        if (code[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }

    if ("({[".includes(ch)) tokens.push({ type: "open", char: ch, pos: i });
    else if (")}]".includes(ch)) tokens.push({ type: "close", char: ch, pos: i });

    i++;
  }

  return tokens;
}

/** Convert a flat character offset to 1-based { line, col } */
function offsetToLineCol(code, offset) {
  const lines = code.split("\n");
  let remaining = offset;
  for (let i = 0; i < lines.length; i++) {
    if (remaining <= lines[i].length) {
      return { line: i + 1, col: remaining + 1 };
    }
    remaining -= lines[i].length + 1;
  }
  return { line: lines.length, col: 1 };
}

function computeBracketMarkers(monaco, code, language) {
  const tokens = extractBracketTokens(code, language);
  const markers = [];
  const stack = [];

  for (const tok of tokens) {
    if (tok.type === "open") {
      stack.push(tok);
    } else {
      if (
        stack.length === 0 ||
        stack[stack.length - 1].char !== CLOSE_TO_OPEN[tok.char]
      ) {
        const { line, col } = offsetToLineCol(code, tok.pos);
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Unexpected '${tok.char}'`,
          startLineNumber: line,
          startColumn: col,
          endLineNumber: line,
          endColumn: col + 1,
        });
      } else {
        stack.pop();
      }
    }
  }

  for (const unclosed of stack) {
    const { line, col } = offsetToLineCol(code, unclosed.pos);
    markers.push({
      severity: monaco.MarkerSeverity.Error,
      message: `Unclosed '${unclosed.char}'`,
      startLineNumber: line,
      startColumn: col,
      endLineNumber: line,
      endColumn: col + 1,
    });
  }

  return markers;
}

function applyCustomValidation(monaco, model, language) {
  const code = model.getValue();
  const markers = computeBracketMarkers(monaco, code, language);
  monaco.editor.setModelMarkers(model, VALIDATOR_OWNER, markers);
}

// ─── Monaco editor options (no auto-suggestions) ─────────────────────────────

const EDITOR_OPTIONS = {
  fontSize: 13,
  fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
  fontLigatures: true,
  lineNumbers: "on",
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  wordWrap: "off",
  tabSize: 2,
  renderLineHighlight: "line",
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  smoothScrolling: true,
  padding: { top: 12, bottom: 12 },

  // Disable ALL auto-suggestion features
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: "off",
  snippetSuggestions: "none",
  parameterHints: { enabled: false },
  acceptSuggestionOnEnter: "off",
  tabCompletion: "off",
  suggest: { enabled: false },
  inlineSuggest: { enabled: false },
  codeLens: false,
  lightbulb: { enabled: "off" },
  hover: { enabled: false },
  links: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Shared Monaco code editor with syntax highlighting, error markers,
 * and all auto-suggestion / intellisense features disabled.
 *
 * Props:
 *   value    – code string
 *   onChange – (value: string) => void  (omit for read-only)
 *   language – 'javascript' | 'python' | 'java' | 'cpp'
 *   isDark   – boolean
 *   readOnly – boolean (default false)
 *   height   – CSS string (default '100%')
 */
const CodeEditor = ({
  value,
  onChange,
  language = "javascript",
  isDark = true,
  readOnly = false,
  height = "100%",
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const contentListenerRef = useRef(null);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Enable Monaco's built-in JS/TS diagnostics (syntax + semantic errors)
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSyntaxValidation: false,
      noSemanticValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowJs: true,
      checkJs: true,
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      noUnusedLocals: false,
    });

    setupCustomValidator(editor, monaco, language);
  };

  function setupCustomValidator(editor, monaco, lang) {
    contentListenerRef.current?.dispose();
    contentListenerRef.current = null;

    const model = editor.getModel();
    if (!model) return;

    if (lang !== "javascript") {
      // Run once immediately, then on every content change
      applyCustomValidation(monaco, model, lang);
      contentListenerRef.current = editor.onDidChangeModelContent(() => {
        applyCustomValidation(monaco, editor.getModel(), lang);
      });
    } else {
      // Clear any custom markers when switching to JS (Monaco handles it)
      monaco.editor.setModelMarkers(model, VALIDATOR_OWNER, []);
    }
  }

  // Re-attach validator when language prop changes
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    setupCustomValidator(editor, monaco, language);
  }, [language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      contentListenerRef.current?.dispose();
    };
  }, []);

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme={isDark ? "algo-arena-dark" : "algo-arena-light"}
      options={{ ...EDITOR_OPTIONS, readOnly }}
      onChange={readOnly ? undefined : onChange}
      onMount={handleMount}
      beforeMount={registerThemes}
      loading={
        <div className="flex items-center justify-center h-full text-secondary text-sm">
          Loading editor…
        </div>
      }
    />
  );
};

export default CodeEditor;
