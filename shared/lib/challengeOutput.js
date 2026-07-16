/**
 * Normalize output for comparison:
 * 1. Trim leading/trailing whitespace
 * 2. Collapse all internal whitespace
 * 3. Normalize cross-language literals (Python's True/False/None → true/false/null)
 */
export const LANG_LITERALS = { True: "true", False: "false", None: "null" };

export const decodeHtmlEntities = (str) => {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
};

export const normalizeOutput = (s) => {
  let decoded = decodeHtmlEntities(s ?? "");
  let trimmed = decoded.trim();
  // Strip outer quotes if it's a string literal, e.g. starts and ends with double quotes
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    trimmed = trimmed.slice(1, -1);
  }
  return trimmed
    .replace(/\s+/g, "")
    .replace(/'/g, '"') // Normalize single quotes to double quotes for comparison
    .replace(/\b(True|False|None)\b/g, (m) => LANG_LITERALS[m]);
};

/** Clean an expected value for display (decode entities, strip outer quotes). */
export const displayExpected = (val) => {
  if (!val) return val;
  let decoded = decodeHtmlEntities(val).trim();
  if (decoded.startsWith('"') && decoded.endsWith('"') && decoded.length >= 2) {
    decoded = decoded.slice(1, -1);
  }
  return decoded;
};

export const tryParseJson = (s) => {
  try {
    const decoded = decodeHtmlEntities(s ?? "").trim();
    const jsonish = decoded
      .replace(/'/g, '"')
      .replace(/\b(True|False|None)\b/g, (m) => LANG_LITERALS[m]);
    return JSON.parse(jsonish);
  } catch {
    return undefined;
  }
};

const FLOAT_REL_TOL = 1e-5;
const FLOAT_ABS_TOL = 1e-9;

export const floatsClose = (a, b) => {
  if (a === b) return true;
  const diff = Math.abs(a - b);
  return diff <= FLOAT_ABS_TOL || diff <= FLOAT_REL_TOL * Math.max(Math.abs(a), Math.abs(b));
};

export const deepEqualWithTolerance = (a, b) => {
  if (typeof a === "number" && typeof b === "number") return floatsClose(a, b);
  if (typeof a !== typeof b) return false;
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqualWithTolerance(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => deepEqualWithTolerance(a[k], b[k]));
  }
  return false;
};

export const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(canonicalize)
      .sort((a, b) => {
        const as = JSON.stringify(a);
        const bs = JSON.stringify(b);
        return as < bs ? -1 : as > bs ? 1 : 0;
      });
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, k) => {
        acc[k] = canonicalize(value[k]);
        return acc;
      }, {});
  }
  return value;
};

export const outputsMatch = (stdout, expected, orderIndependent) => {
  if (expected == null) return false;

  const a = tryParseJson(stdout);
  const b = tryParseJson(expected);

  if (a !== undefined && b !== undefined) {
    if (deepEqualWithTolerance(a, b)) return true;
    if (orderIndependent) {
      return deepEqualWithTolerance(canonicalize(a), canonicalize(b));
    }
  }

  return normalizeOutput(stdout) === normalizeOutput(expected);
};

/**
 * Converts a single test-case arg value to its stdin representation.
 * Arrays → length on first line, then space-separated elements.
 * Nested arrays → row count, then each inner array as "length elements..."
 * This matches the standard competitive-programming format expected by
 * Java's Scanner and C++ cin.
 */
export const formatArgForStdin = (a) => {
  if (a == null) return "";
  if (typeof a === "string") return a;
  if (typeof a === "number" || typeof a === "boolean") return String(a);
  if (Array.isArray(a)) {
    if (a.length > 0 && Array.isArray(a[0])) {
      // 2-D array: row count, then each inner row as "length el1 el2..."
      const rows = a.map((inner) =>
        Array.isArray(inner)
          ? `${inner.length}\n${inner.join(" ")}`
          : String(inner),
      );
      return `${a.length}\n${rows.join("\n")}`;
    }
    // 1-D array: length on first line, elements on second
    return `${a.length}\n${a.join(" ")}`;
  }
  return JSON.stringify(a);
};

/**
 * Converts a test-case's `args` field (which may be an array, a single
 * number, a string, etc.) to a multi-line stdin string.
 */
export const argsToStdin = (args) => {
  if (args == null) return "";
  const list = Array.isArray(args) ? args : [args];
  return list.map(formatArgForStdin).join("\n");
};

export const b64Encode = (str) =>
  btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    ),
  );
export const b64Decode = (str) => {
  if (!str) return "";
  try {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
  } catch {
    return str;
  }
};

// Default full-program stubs (used when challenge has no codeSnippets stored).
export const defaultStarterByLanguage = {
  javascript: `function solution() {\n    // read input, compute, print output\n}\n\nsolution();\n`,
  python: `import sys\ninput = sys.stdin.readline\n\ndef solution():\n    pass\n\nsolution()\n`,
  java: `import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    return 0;\n}\n`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    \n    return 0;\n}\n`,
};

/**
 * Aggregates per-test-case Judge0 results (as produced by runTestCases()) into
 * a single submission-level stat: the worst-case (max) time and memory across
 * every test case that actually executed. Cases with a compile error, a
 * runtime stderr, or a missing time value contribute nothing. Returns null if
 * no case qualifies (e.g. every case errored).
 */
export const computeExecStats = (results) => {
  const usable = (results || []).filter(
    (c) => !c?.compile_output && !c?.stderr && c?.time != null && c?.memory != null,
  );
  if (usable.length === 0) return null;
  return {
    execTimeSec: Math.max(...usable.map((c) => Number(c.time))),
    execMemoryKb: Math.max(...usable.map((c) => Number(c.memory))),
  };
};

/**
 * Formats stored (Judge0-native-unit) exec stats into human-readable strings.
 * Time: milliseconds under 1s, otherwise seconds to 2 decimals.
 * Memory: kilobytes under 1024, otherwise megabytes to 1 decimal.
 * Returns null if either value is missing (nothing to show).
 */
export const formatExecStats = (execTimeSec, execMemoryKb) => {
  if (execTimeSec == null || execMemoryKb == null) return null;
  const time = execTimeSec < 1
    ? `${Math.round(execTimeSec * 1000)} ms`
    : `${execTimeSec.toFixed(2)} s`;
  const memory = execMemoryKb < 1024
    ? `${Math.round(execMemoryKb)} KB`
    : `${(execMemoryKb / 1024).toFixed(1)} MB`;
  return { time, memory };
};
