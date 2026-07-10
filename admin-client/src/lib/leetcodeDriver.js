export const argsToJsonStdin = (args) => {
  if (args == null) return "";
  const list = Array.isArray(args) ? args : [args];
  return list.map(arg => JSON.stringify(arg)).join("\n");
};

// --- LeetCode type system (Tier 1 + Tier 2) ---------------------------------
// LeetCode metaData describes each param/return with a lowercase type string,
// e.g. "integer", "integer[]", "list<list<integer>>". We normalise every type
// to { base, depth } where depth is the array/list nesting (0, 1 or 2). Arrays
// ("integer[]") and lists ("list<integer>") collapse to the same descriptor
// because they read the exact same JSON off stdin.
const SUPPORTED_BASES = new Set([
  "integer",
  "long",
  "double",
  "boolean",
  "string",
  "character",
]);

const parseType = (raw) => {
  let s = String(raw ?? "").trim().toLowerCase();
  let depth = 0;
  // Peel list<...> wrappers, then [] suffixes (either can appear).
  while (s.startsWith("list<") && s.endsWith(">")) {
    s = s.slice(5, -1).trim();
    depth += 1;
  }
  while (s.endsWith("[]")) {
    s = s.slice(0, -2).trim();
    depth += 1;
  }
  return { base: s, depth };
};

const isSupportedType = (raw) => {
  const { base, depth } = parseType(raw);
  return SUPPORTED_BASES.has(base) && depth <= 2;
};

/**
 * Whether a Java/C++ driver can be generated for this signature. Requires at
 * least one argument and every param + the return type to be within Tier 1+2.
 * void / ListNode / TreeNode / unknown types fall back to raw (manual stdin).
 */
export const isDrivableSignature = (language, params, returnType) => {
  if (language !== "java" && language !== "cpp") return false;
  if (!Array.isArray(params) || params.length === 0) return false;
  if (!params.every((p) => isSupportedType(p?.type))) return false;
  return isSupportedType(returnType);
};

// --- C++ codegen helpers ----------------------------------------------------
const CPP_BASE = {
  integer:   { type: "int",       parse: "(int)parseInt()" },
  long:      { type: "long long", parse: "parseInt()" },
  double:    { type: "double",    parse: "parseDouble()" },
  boolean:   { type: "bool",      parse: "parseBool()" },
  string:    { type: "string",    parse: "parseStr()" },
  character: { type: "char",      parse: "parseChar()" },
};

const cppTypeStr = ({ base, depth }) => {
  let t = CPP_BASE[base].type;
  for (let i = 0; i < depth; i += 1) t = `vector<${t}>`;
  return t;
};

const cppParseExpr = ({ base, depth }) => {
  let expr = CPP_BASE[base].parse;
  for (let i = 0; i < depth; i += 1) expr = `parseVec([&](){ return ${expr}; })`;
  return expr;
};

const buildJavaDriver = (code, functionName) => {
  const fn = JSON.stringify(functionName);
  const imports =
    "import java.util.*;\nimport java.io.*;\nimport java.lang.reflect.*;\n\n";
  // Reflection-based: the driver reads the method's generic parameter types at
  // runtime, so no per-signature codegen is needed. Generic JSON is parsed into
  // an Object tree, converted to the declared types, and the result serialised
  // by branching on its runtime type.
  const main = String.raw`public class Main {
    static int _p;
    static String _s;

    static Object parseJson(String str) { _s = str; _p = 0; skipWs(); return parseValue(); }
    static void skipWs() { while (_p < _s.length() && Character.isWhitespace(_s.charAt(_p))) _p++; }
    static Object parseValue() {
        skipWs();
        char c = _s.charAt(_p);
        if (c == '[') return parseArray();
        if (c == '"') return parseString();
        if (c == 't' || c == 'f') return parseBool();
        if (c == 'n') { _p += 4; return null; }
        return parseNumber();
    }
    static List<Object> parseArray() {
        List<Object> list = new ArrayList<>();
        _p++;
        skipWs();
        if (_s.charAt(_p) == ']') { _p++; return list; }
        while (true) {
            list.add(parseValue());
            skipWs();
            char c = _s.charAt(_p++);
            if (c == ']') break;
        }
        return list;
    }
    static String parseString() {
        StringBuilder sb = new StringBuilder();
        _p++;
        while (true) {
            char c = _s.charAt(_p++);
            if (c == '"') break;
            if (c == '\\') {
                char e = _s.charAt(_p++);
                if (e == 'n') sb.append('\n');
                else if (e == 't') sb.append('\t');
                else if (e == 'r') sb.append('\r');
                else if (e == 'b') sb.append('\b');
                else if (e == 'f') sb.append('\f');
                else if (e == 'u') { sb.append((char) Integer.parseInt(_s.substring(_p, _p + 4), 16)); _p += 4; }
                else sb.append(e);
            } else sb.append(c);
        }
        return sb.toString();
    }
    static Boolean parseBool() { if (_s.charAt(_p) == 't') { _p += 4; return Boolean.TRUE; } _p += 5; return Boolean.FALSE; }
    static Object parseNumber() {
        int start = _p;
        while (_p < _s.length()) {
            char c = _s.charAt(_p);
            if (c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E' || (c >= '0' && c <= '9')) _p++;
            else break;
        }
        String num = _s.substring(start, _p);
        if (num.indexOf('.') >= 0 || num.indexOf('e') >= 0 || num.indexOf('E') >= 0) return Double.parseDouble(num);
        return Long.parseLong(num);
    }

    static long toLong(Object v) {
        if (v instanceof Number) return ((Number) v).longValue();
        return Long.parseLong(String.valueOf(v));
    }
    static double toDouble(Object v) {
        if (v instanceof Number) return ((Number) v).doubleValue();
        return Double.parseDouble(String.valueOf(v));
    }

    static Object convert(Object v, java.lang.reflect.Type target) {
        if (target instanceof Class) {
            Class<?> c = (Class<?>) target;
            if (c == int.class || c == Integer.class) return (int) toLong(v);
            if (c == long.class || c == Long.class) return toLong(v);
            if (c == double.class || c == Double.class) return toDouble(v);
            if (c == float.class || c == Float.class) return (float) toDouble(v);
            if (c == boolean.class || c == Boolean.class) return (Boolean) v;
            if (c == char.class || c == Character.class) return ((String) v).charAt(0);
            if (c == String.class) return (String) v;
            if (c.isArray()) {
                List<?> list = (List<?>) v;
                Class<?> comp = c.getComponentType();
                Object arr = Array.newInstance(comp, list.size());
                for (int i = 0; i < list.size(); i++) Array.set(arr, i, convert(list.get(i), comp));
                return arr;
            }
        } else if (target instanceof ParameterizedType) {
            ParameterizedType pt = (ParameterizedType) target;
            Class<?> raw = (Class<?>) pt.getRawType();
            if (List.class.isAssignableFrom(raw)) {
                java.lang.reflect.Type elem = pt.getActualTypeArguments()[0];
                List<?> src = (List<?>) v;
                List<Object> out = new ArrayList<>();
                for (Object o : src) out.add(convert(o, elem));
                return out;
            }
        }
        return v;
    }

    static String quote(String s) {
        StringBuilder sb = new StringBuilder();
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"') sb.append("\\\"");
            else if (c == '\\') sb.append("\\\\");
            else if (c == '\n') sb.append("\\n");
            else if (c == '\t') sb.append("\\t");
            else if (c == '\r') sb.append("\\r");
            else sb.append(c);
        }
        sb.append('"');
        return sb.toString();
    }

    static String toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof String) return quote((String) o);
        if (o instanceof Character) return quote(String.valueOf(o));
        if (o instanceof Boolean) return o.toString();
        if (o instanceof Number) return o.toString();
        if (o.getClass().isArray()) {
            int n = Array.getLength(o);
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < n; i++) { if (i > 0) sb.append(","); sb.append(toJson(Array.get(o, i))); }
            sb.append("]");
            return sb.toString();
        }
        if (o instanceof Iterable) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object e : (Iterable<?>) o) { if (!first) sb.append(","); sb.append(toJson(e)); first = false; }
            sb.append("]");
            return sb.toString();
        }
        return quote(String.valueOf(o));
    }

    public static void main(String[] args) {
        try {
            BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
            List<Object> parsed = new ArrayList<>();
            String line;
            while ((line = br.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                parsed.add(parseJson(line.trim()));
            }
            Solution sol = new Solution();
            Method target = null;
            for (Method m : sol.getClass().getDeclaredMethods()) {
                if (m.getName().equals(FUNC) && m.getParameterCount() == parsed.size()) { target = m; break; }
            }
            if (target == null) throw new RuntimeException("Driver: method not found: " + FUNC);
            target.setAccessible(true);
            java.lang.reflect.Type[] ptypes = target.getGenericParameterTypes();
            Object[] callArgs = new Object[parsed.size()];
            for (int i = 0; i < parsed.size(); i++) callArgs[i] = convert(parsed.get(i), ptypes[i]);
            Object result = target.invoke(sol, callArgs);
            System.out.println(toJson(result));
        } catch (Throwable e) {
            Throwable cause = (e instanceof InvocationTargetException && e.getCause() != null) ? e.getCause() : e;
            cause.printStackTrace();
            System.exit(1);
        }
    }
}
`.replace(/FUNC/g, fn);

  return `${imports}${code}\n\n// --- DRIVER CODE ---\n${main}`;
};

const buildCppDriver = (code, functionName, params) => {
  const descriptors = params.map((p) => parseType(p.type));
  const argDecls = descriptors
    .map(
      (d, i) =>
        `        if (lines.size() <= ${i}) throw runtime_error("Driver: missing input line ${i}");\n` +
        `        _J = lines[${i}]; _P = 0;\n` +
        `        ${cppTypeStr(d)} arg${i} = ${cppParseExpr(d)};`,
    )
    .join("\n");
  const callArgs = descriptors.map((_, i) => `arg${i}`).join(", ");

  const helpers = String.raw`static string _J;
static size_t _P;
static void _skip() { while (_P < _J.size() && isspace((unsigned char)_J[_P])) _P++; }
static long long parseInt() {
    _skip();
    size_t s = _P;
    if (_P < _J.size() && (_J[_P] == '-' || _J[_P] == '+')) _P++;
    while (_P < _J.size() && isdigit((unsigned char)_J[_P])) _P++;
    return stoll(_J.substr(s, _P - s));
}
static double parseDouble() {
    _skip();
    size_t s = _P;
    while (_P < _J.size()) {
        char c = _J[_P];
        if (isdigit((unsigned char)c) || c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E') _P++;
        else break;
    }
    return stod(_J.substr(s, _P - s));
}
static bool parseBool() { _skip(); if (_J[_P] == 't') { _P += 4; return true; } _P += 5; return false; }
static string parseStr() {
    _skip();
    string out;
    _P++;
    while (_P < _J.size() && _J[_P] != '"') {
        char c = _J[_P++];
        if (c == '\\' && _P < _J.size()) {
            char e = _J[_P++];
            if (e == 'n') out += '\n';
            else if (e == 't') out += '\t';
            else if (e == 'r') out += '\r';
            else out += e;
        } else out += c;
    }
    _P++;
    return out;
}
static char parseChar() { string s = parseStr(); return s.empty() ? '\0' : s[0]; }
template<class F> auto parseVec(F f) -> vector<decltype(f())> {
    vector<decltype(f())> v;
    _skip(); _P++; _skip();
    if (_P < _J.size() && _J[_P] == ']') { _P++; return v; }
    while (true) { v.push_back(f()); _skip(); char c = _J[_P++]; if (c == ']') break; }
    return v;
}

static string _esc(const string& s) {
    string r = "\"";
    for (char c : s) {
        if (c == '"') r += "\\\"";
        else if (c == '\\') r += "\\\\";
        else if (c == '\n') r += "\\n";
        else if (c == '\t') r += "\\t";
        else if (c == '\r') r += "\\r";
        else r += c;
    }
    r += "\"";
    return r;
}
static string toJson(int x) { return to_string(x); }
static string toJson(long x) { return to_string(x); }
static string toJson(long long x) { return to_string(x); }
static string toJson(bool x) { return x ? "true" : "false"; }
static string toJson(double x) { ostringstream ss; ss << x; return ss.str(); }
static string toJson(char c) { return _esc(string(1, c)); }
static string toJson(const string& s) { return _esc(s); }
template<class T> static string toJson(const vector<T>& v) {
    string r = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) r += ","; r += toJson(v[i]); }
    r += "]";
    return r;
}
`;

  return `#include <bits/stdc++.h>
using namespace std;

${code}

// --- DRIVER CODE ---
${helpers}
int main() {
    ios_base::sync_with_stdio(false);
    try {
        vector<string> lines;
        string line;
        while (getline(cin, line)) {
            if (line.find_first_not_of(" \\t\\r\\n") != string::npos) lines.push_back(line);
        }
${argDecls}
        Solution _sol;
        auto _result = _sol.${functionName}(${callArgs});
        cout << toJson(_result) << "\\n";
    } catch (const exception& e) {
        cerr << e.what() << "\\n";
        return 1;
    }
    return 0;
}
`;
};

export const wrapWithDriver = (code, language, functionName, params, returnType) => {
  if (!functionName) return code;

  if (language === "python") {
    return `from typing import *
import collections
import math
import heapq
import bisect

${code}

# --- DRIVER CODE ---
import sys
import json

def _run_driver():
    try:
        # Read all non-empty lines from stdin
        lines = [line.strip() for line in sys.stdin]
        args = [json.loads(line) for line in lines if line.strip()]

        # Find and execute the function
        if 'Solution' in globals() or 'Solution' in locals():
            sol = Solution()
            fn = getattr(sol, ${JSON.stringify(functionName)})
        else:
            fn = globals()[${JSON.stringify(functionName)}]

        result = fn(*args)
        print(json.dumps(result))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    _run_driver()
`;
  }

  if (language === "javascript") {
    return `${code}

// --- DRIVER CODE ---
(function() {
  const fs = require('fs');
  try {
    const content = fs.readFileSync(0, 'utf-8');
    const lines = content.split('\\n').map(l => l.trim()).filter(Boolean);
    const args = lines.map(l => JSON.parse(l));
    const fn = eval(${JSON.stringify(functionName)});
    const result = fn(...args);
    console.log(JSON.stringify(result === undefined ? null : result));
  } catch (err) {
    console.error(err.stack || err);
    process.exit(1);
  }
})();
`;
  }

  // Java and C++ need typed drivers; only generate when the whole signature is
  // within Tier 1+2. Otherwise fall back to running the raw code (manual stdin).
  if (language === "java" && isDrivableSignature(language, params, returnType)) {
    return buildJavaDriver(code, functionName);
  }

  if (language === "cpp" && isDrivableSignature(language, params, returnType)) {
    return buildCppDriver(code, functionName, params);
  }

  return code;
};
