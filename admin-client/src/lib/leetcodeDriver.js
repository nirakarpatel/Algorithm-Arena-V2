export const argsToJsonStdin = (args) => {
  if (args == null) return "";
  const list = Array.isArray(args) ? args : [args];
  return list.map(arg => JSON.stringify(arg)).join("\n");
};

export const wrapWithDriver = (code, language, functionName) => {
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

  return code;
};
