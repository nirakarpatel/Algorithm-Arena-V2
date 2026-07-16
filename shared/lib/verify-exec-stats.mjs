// Verifies the pure exec-stats aggregation/formatting functions with real
// assertions (no mocks). Usage: node shared/lib/verify-exec-stats.mjs
import assert from "node:assert/strict";
import { computeExecStats, formatExecStats } from "./challengeOutput.js";

let failures = 0;
const check = (desc, fn) => {
  try {
    fn();
    console.log(`  ok   ${desc}`);
  } catch (e) {
    failures++;
    console.error(`  FAIL ${desc}\n    ${e.message}`);
  }
};

// --- computeExecStats -------------------------------------------------------
check("empty array -> null", () => {
  assert.equal(computeExecStats([]), null);
});

check("undefined/null input -> null", () => {
  assert.equal(computeExecStats(undefined), null);
  assert.equal(computeExecStats(null), null);
});

check("all cases errored (compile_output) -> null", () => {
  const r = [{ compile_output: "syntax error", time: null, memory: null }];
  assert.equal(computeExecStats(r), null);
});

check("all cases errored (stderr) -> null", () => {
  const r = [{ stderr: "boom", time: "0.01", memory: 1000 }];
  assert.equal(computeExecStats(r), null);
});

check("mixed errored + successful: only successful cases count", () => {
  const r = [
    { compile_output: "", stderr: "runtime error", time: "0.5", memory: 50000 },
    { time: "0.02", memory: 15000 },
    { time: "0.03", memory: 12000 },
  ];
  assert.deepEqual(computeExecStats(r), { execTimeSec: 0.03, execMemoryKb: 15000 });
});

check("case with time but missing memory is excluded, not NaN", () => {
  const r = [
    { time: "0.05", memory: null },
    { time: "0.02", memory: 15000 },
  ];
  assert.deepEqual(computeExecStats(r), { execTimeSec: 0.02, execMemoryKb: 15000 });
});

check("string time/memory values are coerced to numbers for max", () => {
  const r = [
    { time: "0.100", memory: "20000" },
    { time: "0.050", memory: "30000" },
  ];
  assert.deepEqual(computeExecStats(r), { execTimeSec: 0.1, execMemoryKb: 30000 });
});

check("single successful case", () => {
  const r = [{ time: "0.007", memory: 9000 }];
  assert.deepEqual(computeExecStats(r), { execTimeSec: 0.007, execMemoryKb: 9000 });
});

// --- formatExecStats ---------------------------------------------------------
check("null inputs -> null", () => {
  assert.equal(formatExecStats(null, null), null);
  assert.equal(formatExecStats(0.5, null), null);
  assert.equal(formatExecStats(null, 500), null);
});

check("sub-second time formats as rounded ms", () => {
  assert.deepEqual(formatExecStats(0.024, 500), { time: "24 ms", memory: "500 KB" });
});

check(">=1s time formats as seconds with 2 decimals", () => {
  assert.deepEqual(formatExecStats(1.5, 500), { time: "1.50 s", memory: "500 KB" });
});

check("sub-1024KB memory formats as rounded KB", () => {
  assert.deepEqual(formatExecStats(0.01, 1023), { time: "10 ms", memory: "1023 KB" });
});

check(">=1024KB memory formats as MB with 1 decimal", () => {
  assert.deepEqual(formatExecStats(0.01, 2048), { time: "10 ms", memory: "2.0 MB" });
});

check("exactly 1024KB crosses into MB", () => {
  assert.deepEqual(formatExecStats(0.01, 1024), { time: "10 ms", memory: "1.0 MB" });
});

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
