import React from "react";
import {
  FiGithub,
  FiRefreshCw,
  FiCheck,
  FiXCircle,
  FiPlay,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

import { argsToJsonStdin, isDrivableSignature } from "../../lib/leetcodeDriver";
import {
  argsToStdin,
  outputsMatch,
  displayExpected,
  computeExecStats,
  formatExecStats,
} from "../../lib/challengeOutput";

/**
 * Render-only bottom test/result panel for the challenge page. All state lives
 * in the page component; this panel receives values + callbacks as props.
 */
const TestResultPanel = ({
  bottomCollapsed,
  bottomHeight,
  handleBottomResize,
  updateBottomCollapsed,
  bottomTab,
  setBottomTab,
  handleRun,
  running,
  cooldown,
  isReviewMode,
  challenge,
  selectedCaseIdx,
  setSelectedCaseIdx,
  language,
  stdin,
  setStdin,
  repoUrl,
  setRepoUrl,
  runOutput,
}) => {
  return (
    <div
      className="relative flex flex-col border-t border-subtle shrink-0"
      style={{ height: bottomCollapsed ? "auto" : `${bottomHeight}px` }}
    >
      {/* Drag handle to resize the panel (and grow the editor) */}
      {!bottomCollapsed && (
        <div
          onMouseDown={handleBottomResize}
          className="absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize flex justify-center items-center group z-10"
          title="Drag to resize"
        >
          <div className="w-16 h-1 bg-white/15 group-hover:bg-accent rounded-full transition-colors" />
        </div>
      )}
      {/* Console header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-subtle shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateBottomCollapsed((c) => !c)}
            className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-white/5"
          >
            {bottomCollapsed ? (
              <FiChevronUp size={13} />
            ) : (
              <FiChevronDown size={13} />
            )}
            Console
          </button>
          {[
            { key: "input", label: "Testcase" },
            { key: "output", label: "Test Result" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setBottomTab(key);
                updateBottomCollapsed(false);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                !bottomCollapsed && bottomTab === key
                  ? "text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={running || cooldown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 border border-subtle hover:bg-white/5 text-primary"
          >
            {running ? (
              <FiRefreshCw size={11} className="animate-spin" />
            ) : (
              <FiPlay size={11} className="text-green-400" />
            )}
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {/* Panel body */}
      {!bottomCollapsed && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {bottomTab === "input" ? (
            /* ── Test tab ── */
            <div className="h-full flex flex-col px-3 py-2 gap-2 overflow-y-auto">
              {challenge.testCases?.length > 0 ? (
                <>
                  {/* Case selector */}
                  <div className="flex gap-1 flex-wrap shrink-0">
                    {challenge.testCases.map((tc, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedCaseIdx(i);
                          const hasFunction = !!challenge?.functionName;
                          const isSupportedDriver = language === "python" || language === "javascript"
                            || isDrivableSignature(language, challenge?.params, challenge?.returnType);
                          setStdin((hasFunction && isSupportedDriver) ? argsToJsonStdin(tc.args) : argsToStdin(tc.args));
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                          selectedCaseIdx === i
                            ? "bg-accent/20 text-accent"
                            : "text-secondary hover:text-primary bg-black/5 dark:bg-white/5"
                        }`}
                      >
                        {tc.label}
                      </button>
                    ))}
                  </div>

                  {/* Selected case: input + expected side-by-side */}
                  {(() => {
                    const tc = challenge.testCases[selectedCaseIdx];
                    if (!tc) return null;
                    const hasFunction = !!challenge?.functionName;
                    const isSupportedDriver = language === "python" || language === "javascript"
                      || isDrivableSignature(language, challenge?.params, challenge?.returnType);
                    const inputStr = (hasFunction && isSupportedDriver) ? argsToJsonStdin(tc.args) : argsToStdin(tc.args);
                    return (
                      <div className="flex gap-2 shrink-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                            Input
                          </p>
                          <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded-md px-2 py-1.5 text-primary whitespace-pre-wrap break-all">
                            {inputStr || "(empty)"}
                          </pre>
                        </div>
                        {tc.expected && (
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                              Expected
                            </p>
                            <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded-md px-2 py-1.5 text-primary whitespace-pre-wrap break-all">
                              {displayExpected(tc.expected)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Editable stdin for custom runs */}
                  <div className="shrink-0">
                    <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                      Custom stdin
                    </p>
                    <textarea
                      className="w-full resize-none bg-black/5 dark:bg-white/5 rounded-md px-2 py-1.5 text-xs font-mono text-primary placeholder:text-secondary/40 focus:outline-none"
                      rows={2}
                      placeholder="Override stdin for a custom run…"
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      spellCheck={false}
                    />
                  </div>
                  {/* GitHub repo URL (optional) — only for normal (non-review) submissions */}
                  {!isReviewMode && (
                    <div className="shrink-0 pt-2 border-t border-subtle">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-black/5 dark:bg-white/5 focus-within:ring-1 ring-accent/40 transition-all">
                        <FiGithub
                          size={13}
                          className="text-secondary shrink-0"
                        />
                        <input
                          name="submissionRepositoryUrl"
                          type="url"
                          placeholder="GitHub repo URL (optional)"
                          className="bg-transparent text-xs text-primary placeholder-white/25 focus:outline-none w-full"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <textarea
                  className="flex-1 resize-none bg-black/5 dark:bg-white/5 rounded-md px-2 py-1.5 text-xs font-mono text-primary placeholder:text-secondary/40 focus:outline-none"
                  placeholder="Enter stdin input here…"
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  spellCheck={false}
                />
              )}
            </div>
          ) : (
            /* ── Result tab ── */
            <div className="h-full overflow-y-auto px-3 py-2 space-y-2">
              {!runOutput ? (
                <p className="text-secondary/40 text-xs font-mono">
                  Press Run to see output here…
                </p>
              ) : runOutput.error ? (
                <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">
                  {runOutput.error}
                </pre>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const stats = computeExecStats(runOutput.cases);
                    const formatted = stats ? formatExecStats(stats.execTimeSec, stats.execMemoryKb) : null;
                    return formatted ? (
                      <p className="text-[11px] font-mono text-secondary bg-black/5 dark:bg-white/5 rounded-md px-2.5 py-1.5 inline-block">
                        Max: {formatted.time} · {formatted.memory}
                      </p>
                    ) : null;
                  })()}
                  {runOutput.cases.map((c, i) => {
                    const hasError = c.compile_output || c.stderr;
                    const matches =
                      c.expected != null &&
                      outputsMatch(c.stdout, c.expected, challenge?.orderIndependent);
                    const passed = !hasError && matches;
                    const failed =
                      !hasError && c.expected != null && !matches;
                    return (
                      <div
                        key={i}
                        className={`rounded-lg border px-3 py-2 space-y-2 ${
                          hasError
                            ? "border-red-500/30 bg-red-500/5"
                            : passed
                              ? "border-green-500/30 bg-green-500/5"
                              : failed
                                ? "border-red-500/20 bg-black/5 dark:bg-white/5"
                                : "border-subtle bg-black/5 dark:bg-white/5"
                        }`}
                      >
                        {/* Case header */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary">
                            {c.label}
                          </span>
                          {hasError ? (
                            <span className="text-[10px] font-bold text-red-400">
                              {c.compile_output
                                ? "Compile Error"
                                : "Runtime Error"}
                            </span>
                          ) : passed ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400">
                              <FiCheck size={10} /> Passed
                            </span>
                          ) : failed ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                              <FiXCircle size={10} /> Wrong Answer
                            </span>
                          ) : null}
                        </div>

                        {/* Error body */}
                        {hasError && (
                          <pre className="text-[11px] font-mono text-red-400 whitespace-pre-wrap break-all">
                            {c.compile_output || c.stderr}
                          </pre>
                        )}

                        {/* Output */}
                        {!hasError && (
                          <>
                            {c.stdinValue != null && (
                              <div>
                                <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                                  Input (stdin)
                                </p>
                                <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded-md px-2 py-1 text-primary whitespace-pre-wrap break-all">
                                  {c.stdinValue || "(empty)"}
                                </pre>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                                Output
                              </p>
                              <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded-md px-2 py-1 text-primary whitespace-pre-wrap break-all">
                                {c.stdout || "(no output)"}
                              </pre>
                            </div>
                            {c.expected != null && (
                              <div>
                                <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                                  Expected
                                </p>
                                <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded-md px-2 py-1 text-primary whitespace-pre-wrap break-all">
                                  {displayExpected(c.expected)}
                                </pre>
                              </div>
                            )}
                            {c.time && (
                              <p className="text-[10px] text-secondary font-mono">
                                {c.time}s · {c.memory} KB
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestResultPanel;
