import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import {
  FiClipboard,
  FiRefreshCw,
  FiCode,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiCheck,
  FiXCircle,
  FiMessageSquare,
  FiUser,
  FiPlay,
  FiChevronDown,
  FiChevronUp,
  FiMaximize2,
  FiMinimize2,
} from "react-icons/fi";

import CodeEditor from "../components/CodeEditor";
import { LANGUAGE_MAP, LANGUAGE_OPTIONS } from "../constants/languages";
import SkeletonCard from "../components/SkeletonCard";
import { api } from "../lib/api";
import { argsToJsonStdin, wrapWithDriver, isDrivableSignature } from "../lib/leetcodeDriver";
import { decodeReviewQueue, getQueueNav, buildReviewUrl } from "../lib/reviewQueue";
import { useAuth } from "../context/useAuth";

import {
  normalizeOutput,
  displayExpected,
  argsToStdin,
  b64Encode,
  b64Decode,
  defaultStarterByLanguage,
  outputsMatch,
  formatExecStats,
} from "../lib/challengeOutput";


const ChallengeDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const reviewSubmissionId = searchParams.get("review");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isReviewer = ["admin", "superAdmin", "super-admin", "clan-chief"].includes(user?.role);
  const isReviewMode = Boolean(reviewSubmissionId) && isReviewer;
  const queueParam = searchParams.get("queue") || "";
  const reviewQueueList = useMemo(() => decodeReviewQueue(queueParam), [queueParam]);
  const queueNav = useMemo(
    () => getQueueNav(reviewQueueList, reviewSubmissionId),
    [reviewQueueList, reviewSubmissionId],
  );

  const [codeByLang, setCodeByLang] = useState({});
  const [language, setLanguage] = useState("javascript");
  const [solutionLanguage, setSolutionLanguage] = useState("javascript");
  const [leftTab, setLeftTab] = useState("description");
  const [mobileTab, setMobileTab] = useState("description");

  // Console panel
  const [bottomTab, setBottomTab] = useState("input");
  const [stdin, setStdin] = useState("");
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [runOutput, setRunOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const abortControllerRef = useRef(null);
  const [bottomHeight, setBottomHeight] = useState(() => {
    const saved = localStorage.getItem("admin-challenge-bottom-height");
    return saved ? parseInt(saved, 10) : 224;
  });
  const [bottomCollapsed, setBottomCollapsed] = useState(() => {
    const saved = localStorage.getItem("admin-challenge-bottom-collapsed");
    return saved === "true";
  });

  // Review state
  const [reviewComment, setReviewComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [grading, setGrading] = useState(false);

  // Layout
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem("admin-challenge-left-width");
    return saved ? parseFloat(saved) : 45;
  });
  const containerRef = useRef(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute("data-theme") === "dark",
  );

  useEffect(() => {
    const checkDark = () =>
      document.documentElement.getAttribute("data-theme") === "dark" ||
      document.documentElement.classList.contains("dark");
    const observer = new MutationObserver(() => setIsDark(checkDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const updateBottomCollapsed = (val) => {
    setBottomCollapsed((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      localStorage.setItem("admin-challenge-bottom-collapsed", String(next));
      return next;
    });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;
      setLeftWidth(newWidth);
      localStorage.setItem("admin-challenge-left-width", String(newWidth));
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleBottomResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bottomHeight;
    const handleMove = (ev) => {
      let h = startH - (ev.clientY - startY);
      if (h < 80) h = 80;
      if (h > 520) h = 520;
      setBottomHeight(h);
      localStorage.setItem("admin-challenge-bottom-height", String(h));
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const setCodeSnippet = (val) => {
    const newVal = typeof val === "function" ? val(codeByLang[language] || "") : val;
    setCodeByLang((prev) => ({ ...prev, [language]: newVal }));
  };

  const challengeQuery = useQuery({
    queryKey: ["challenge", id],
    queryFn: async () => {
      const res = await api.get(`/api/challenges/${id}`);
      return res.data.data;
    },
  });

  const reviewQuery = useQuery({
    queryKey: ["review-submission", reviewSubmissionId],
    enabled: isReviewMode && Boolean(reviewSubmissionId),
    queryFn: async () => {
      const res = await api.get(`/api/submissions/${reviewSubmissionId}`);
      return res.data.data;
    },
  });

  const starterCode = useMemo(() => {
    const challenge = challengeQuery.data;
    if (challenge?.codeSnippets) {
      const match = challenge.codeSnippets.find((s) => s.langSlug === language);
      if (match) return match.code;
    }
    return defaultStarterByLanguage[language] ?? "";
  }, [challengeQuery.data, language]);

  const codeSnippet = codeByLang[language] ?? starterCode;

  useEffect(() => {
    if (!isReviewMode || !reviewQuery.data) return;
    const sub = reviewQuery.data;
    if (sub.code) {
      setCodeByLang({ [sub.language || "javascript"]: sub.code });
      setLanguage(sub.language || "javascript");
    }
  }, [isReviewMode, reviewQuery.data]);

  // A language is offered only if this challenge can actually run in it.
  // Python/JS drivers are dynamic; compiled languages need a drivable signature.
  // Manual-stdin challenges (no functionName) are never gated.
  const isLanguageRunnable = (langKey) => {
    const ch = challengeQuery.data;
    if (!ch?.functionName) return true;
    if (langKey === "python" || langKey === "javascript") return true;
    return isDrivableSignature(langKey, ch.params, ch.returnType);
  };

  useEffect(() => {
    if (!challengeQuery.data || isReviewMode) return;
    if (!isLanguageRunnable(language)) {
      const firstRunnable = LANGUAGE_OPTIONS.find((o) => isLanguageRunnable(o.key));
      if (firstRunnable) setLanguage(firstRunnable.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeQuery.data, language, isReviewMode]);

  const solutionEntries = useMemo(
    () => (challengeQuery.data?.solutions || []).filter((s) => s.code?.trim()),
    [challengeQuery.data],
  );

  useEffect(() => {
    if (solutionEntries.length === 0) return;
    if (solutionEntries.some((s) => s.langSlug === solutionLanguage)) return;
    setSolutionLanguage(solutionEntries[0].langSlug || "javascript");
  }, [solutionEntries, solutionLanguage]);

  const selectedSolution = useMemo(
    () => solutionEntries.find((s) => s.langSlug === solutionLanguage),
    [solutionEntries, solutionLanguage],
  );

  const handleGrade = async (status) => {
    setGrading(true);
    try {
      await api.put(`/api/submissions/${reviewSubmissionId}`, {
        status,
        feedback: status === "Rejected" ? reviewComment.trim() || undefined : undefined,
      });
      toast.success(`Submission ${status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["chief-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      if (status === "Pending") {
        // Revoke: stay on this submission so it re-renders with the reverted status.
        queryClient.invalidateQueries({ queryKey: ["review-submission", reviewSubmissionId] });
      } else if (queueNav.next) {
        // Auto-advance to the next submission in the queue.
        navigate(buildReviewUrl(queueNav.next, queueParam));
      } else {
        // Queue exhausted (or no queue) — return to the Review Work tab.
        navigate("/?tab=review");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to grade submission");
    } finally {
      setGrading(false);
    }
  };

  const codeStats = useMemo(
    () => ({
      lines: codeSnippet ? codeSnippet.split("\n").length : 0,
      characters: codeSnippet.length,
    }),
    [codeSnippet],
  );

  const handleCopyCode = async () => {
    if (!codeSnippet.trim()) return toast.error("No code to copy");
    try {
      await navigator.clipboard.writeText(codeSnippet);
      toast.success("Code copied");
    } catch {
      toast.error("Unable to copy");
    }
  };

  // --- JUDGE0 RUN LOGIC ---
  const runTestCases = async (signal) => {
    const challenge = challengeQuery.data;
    const testCases = challenge?.testCases ?? [];
    const hasFunction = !!challenge?.functionName;
    const isSupportedDriver = language === "python" || language === "javascript"
      || isDrivableSignature(language, challenge?.params, challenge?.returnType);

    const runs =
      testCases.length > 0
        ? testCases.map((tc) => ({
            label: tc.label,
            stdinValue:
              hasFunction && isSupportedDriver
                ? argsToJsonStdin(tc.args)
                : argsToStdin(tc.args),
            expected: tc.expected ?? null,
          }))
        : [{ label: "Run", stdinValue: stdin, expected: null }];

    const langId = LANGUAGE_MAP[language]?.id ?? 63;
    const commentChar = language === "python" ? "#" : "//";
    const finalSourceCode =
      hasFunction && isSupportedDriver
        ? wrapWithDriver(codeSnippet, language, challenge.functionName, challenge.params, challenge.returnType)
        : codeSnippet;

    const freshSource = (idx) =>
      b64Encode(
        `${finalSourceCode}\n${commentChar} run:${idx}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );

    const batchRes = await api.post(
      "/api/submissions/run/batch",
      {
        submissions: runs.map((run, idx) => ({
          language_id: langId,
          source_code: freshSource(idx),
          stdin: b64Encode(run.stdinValue),
        })),
      },
      { signal },
    );

    const tokens = batchRes.data.map((t) => t.token);
    const tokenList = tokens.join(",");
    let results = tokens.map(() => null);

    for (let attempt = 0; attempt < 30; attempt++) {
      if (signal?.aborted) return;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 1000);
        signal?.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
      if (signal?.aborted) return;

      const pollRes = await api.get(`/api/submissions/run/batch?tokens=${tokenList}`, { signal });
      const submissions = pollRes.data?.submissions || [];

      submissions.forEach((sub, i) => {
        const statusId = sub?.status?.id;
        if (statusId !== 1 && statusId !== 2) {
          results[i] = {
            label: runs[i].label,
            expected: runs[i].expected,
            stdinValue: runs[i].stdinValue,
            token: tokens[i],
            stdout: b64Decode(sub.stdout),
            stderr: b64Decode(sub.stderr),
            compile_output: b64Decode(sub.compile_output),
            status: sub.status,
            time: sub.time,
            memory: sub.memory,
          };
        }
      });

      const ready = results.filter(Boolean);
      if (ready.length > 0) setRunOutput({ cases: ready });
      if (results.every(Boolean)) break;
    }

    results = results.map(
      (r, i) =>
        r ?? {
          label: runs[i].label,
          expected: runs[i].expected,
          stdinValue: runs[i].stdinValue,
          stdout: "",
          stderr: "Timed out waiting for Judge0 result.",
          compile_output: "",
          status: { description: "Timeout" },
          time: null,
          memory: null,
        },
    );
    setRunOutput({ cases: results });
    return results;
  };

  const handleRun = async () => {
    if (!codeSnippet.trim()) return toast.error("No code to run.");
    if (cooldown) return toast.error("Please wait a moment between runs.");

    setRunning(true);
    updateBottomCollapsed(false);
    setBottomTab("output");
    setRunOutput(null);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await runTestCases(controller.signal);
    } catch (err) {
      if (err.name === "AbortError" || err.message === "Aborted") return;
      toast.error(err.response?.data?.message || err.message || "Failed to execute code.");
      setRunOutput({
        error: err.response?.data?.message || err.message || "Execution engine unreachable.",
      });
    } finally {
      setRunning(false);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
    }
  };

  const sanitizedDescription = useMemo(() => {
    const raw = challengeQuery.data?.description || "";
    return DOMPurify.sanitize(raw, { ADD_TAGS: ["img"], ADD_ATTR: ["target"] });
  }, [challengeQuery.data?.description]);

  if (challengeQuery.isLoading)
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-8">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );

  if (challengeQuery.isError || !challengeQuery.data)
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Not Available</h2>
        <button className="btn-secondary mt-4" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    );

  const challenge = challengeQuery.data;
  const difficultyColor =
    challenge.difficulty === "Easy"
      ? "text-green-400"
      : challenge.difficulty === "Medium"
        ? "text-yellow-400"
        : "text-red-400";
  const difficultyBg =
    challenge.difficulty === "Easy"
      ? "bg-green-500/15"
      : challenge.difficulty === "Medium"
        ? "bg-yellow-500/15"
        : "bg-red-500/15";

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1 border-b border-black/10 dark:border-white/10 mb-1.5 shrink-0 px-3 pt-1.5">
        <Link
          to={isReviewMode ? "/?tab=review" : "/"}
          className="flex items-center gap-1 text-secondary hover:text-primary transition-colors text-xs"
        >
          <FiChevronLeft size={14} />
          <span className="hidden sm:inline">{isReviewMode ? "Reviews" : "Back"}</span>
        </Link>
        <div className="w-px h-4 bg-black/10 dark:bg-white/10" />
        {isReviewMode && queueNav.index !== -1 && (
          <>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => queueNav.prev && navigate(buildReviewUrl(queueNav.prev, queueParam))}
                disabled={!queueNav.prev}
                title="Previous submission"
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={14} />
              </button>
              <span className="text-[10px] font-bold text-tertiary tabular-nums px-0.5">
                {queueNav.index + 1}/{queueNav.total}
              </span>
              <button
                type="button"
                onClick={() => queueNav.next && navigate(buildReviewUrl(queueNav.next, queueParam))}
                disabled={!queueNav.next}
                title="Next submission"
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FiChevronRight size={14} />
              </button>
            </div>
            <div className="w-px h-4 bg-black/10 dark:bg-white/10" />
          </>
        )}
        <a href={challenge.link || "#"} target="_blank" rel="noopener noreferrer">
          <h1 className="text-sm sm:text-base font-bold truncate flex flex-row items-center gap-1.5 hover:text-accent transition-colors">
            {challenge.title} <FiExternalLink size={12} />
          </h1>
        </a>
        <div className="flex items-center gap-1.5 ml-auto shrink-0 flex-wrap justify-end">
          {challenge.tags?.map((tag, idx) => (
            <span key={idx} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-secondary border border-white/5">
              {tag}
            </span>
          ))}
          {(!challenge.tags || challenge.tags.length === 0) && challenge.category && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-secondary border border-white/5">
              {challenge.category}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${difficultyBg} ${difficultyColor}`}>
            {challenge.difficulty}
          </span>
          <span className="text-secondary text-xs hidden sm:inline">{challenge.points} XP</span>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden mb-2 px-2 shrink-0">
        <div className="flex w-full bg-black/10 dark:bg-white/10 rounded-lg p-1 gap-1">
          <button
            className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${mobileTab === "description" ? "bg-accent text-white shadow-lg" : "text-secondary hover:text-primary"}`}
            onClick={() => setMobileTab("description")}
          >
            Challenge Info
          </button>
          <button
            className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${mobileTab === "editor" ? "bg-accent text-white shadow-lg" : "text-secondary hover:text-primary"}`}
            onClick={() => setMobileTab("editor")}
          >
            Code Editor
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div
        ref={containerRef}
        className="flex flex-col lg:flex-row flex-1 min-h-0 w-full relative h-full px-1 pb-1"
        style={{
          "--left-width": `${leftWidth}%`,
          "--right-width": `calc(${100 - leftWidth}% - 12px)`,
        }}
      >
        {/* LEFT PANEL */}
        <div
          className={`flex-1 lg:flex-none flex-col min-h-0 macos-glass rounded-xl overflow-hidden w-full lg:w-[var(--left-width)] lg:mb-0 mb-3 h-full ${isMaximized ? "hidden" : ""} ${mobileTab === "editor" ? "hidden lg:flex" : "flex"}`}
        >
          <div className="flex border-b border-black/10 dark:border-white/10 shrink-0 overflow-x-auto">
            <button
              className={`px-4 py-3 text-sm font-semibold relative whitespace-nowrap ${leftTab === "description" ? "text-primary" : "text-secondary"}`}
              onClick={() => setLeftTab("description")}
            >
              <FiFileText className="inline mr-2" />
              Description
              {leftTab === "description" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
            <button
              className={`px-4 py-3 text-sm font-semibold relative whitespace-nowrap ${leftTab === "solutions" ? "text-primary" : "text-secondary"}`}
              onClick={() => setLeftTab("solutions")}
            >
              <FiCode className="inline mr-2" />
              Solutions
              {leftTab === "solutions" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {leftTab === "description" ? (
              <div className="space-y-4">
                <div
                  className="leetcode-description text-sm leading-relaxed text-primary/90"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
                <div className="flex flex-wrap gap-2 pt-4 border-t border-black/10 dark:border-white/10">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${difficultyBg} ${difficultyColor}`}>
                    {challenge.difficulty}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent/10 text-accent">
                    {challenge.points} XP
                  </span>
                  {challenge.tags?.map((tag, idx) => (
                    <span key={idx} className="text-xs font-semibold px-2 py-1 rounded bg-white/5 text-secondary border border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : leftTab === "solutions" ? (
              <div className="flex flex-col min-h-[520px] space-y-4">
                {solutionEntries.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-primary">Reference Solution</p>
                        <p className="text-xs text-secondary">
                          {solutionEntries.length} language{solutionEntries.length === 1 ? "" : "s"} available
                        </p>
                      </div>
                      <select
                        className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-xs px-2 py-1.5 text-primary focus:outline-none"
                        value={solutionLanguage}
                        onChange={(e) => setSolutionLanguage(e.target.value)}
                      >
                        {solutionEntries.map((s) => (
                          <option key={s.langSlug} value={s.langSlug} className="bg-white dark:bg-[#1a1a24]">
                            {s.lang || LANGUAGE_OPTIONS.find((o) => o.key === s.langSlug)?.label || s.langSlug}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-h-[460px] overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/40">
                      <CodeEditor
                        value={selectedSolution?.code || "// No solution for this language."}
                        language={LANGUAGE_MAP[solutionLanguage]?.monacoLang ?? solutionLanguage}
                        isDark={isDark}
                        readOnly={true}
                        height="460px"
                      />
                    </div>
                  </>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center border border-dashed border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-white/5 p-6">
                    <FiCode className="text-tertiary mb-3" size={28} />
                    <p className="text-sm font-semibold text-primary">No solutions uploaded</p>
                    <p className="text-xs text-secondary mt-1">Add a solution via the Challenges tab.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Resizer */}
        <div
          className={`hidden lg:flex w-3 cursor-col-resize justify-center items-center group shrink-0 z-10 hover:bg-white/5 transition-colors ${isMaximized ? "lg:hidden" : ""}`}
          onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-16 bg-white/10 group-hover:bg-accent rounded-full transition-colors" />
        </div>

        {/* RIGHT PANEL */}
        <div
          className={`flex-1 lg:flex-none flex-col min-h-0 macos-glass rounded-xl overflow-hidden border border-white/5 w-full ${isMaximized ? "lg:w-full" : "lg:w-[var(--right-width)]"} h-full ${mobileTab === "description" ? "hidden lg:flex" : "flex"}`}
        >
          {/* Editor header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <FiCode size={13} className="text-accent" />
              <select
                className="bg-transparent text-xs font-semibold text-primary focus:outline-none border-none"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isReviewMode}
              >
                {LANGUAGE_OPTIONS.map((opt) => {
                  const runnable = isLanguageRunnable(opt.key);
                  return (
                    <option
                      key={opt.key}
                      value={opt.key}
                      disabled={!runnable}
                      className="bg-white dark:bg-[#1a1a24] text-black dark:text-white"
                    >
                      {opt.label}{opt.version && ` (${opt.version})`}{!runnable && " — no runner"}
                    </option>
                  );
                })}
              </select>
              {isReviewMode && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                  Review Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-secondary">
              <span className="text-[11px] hidden sm:inline">
                {codeStats.lines} lines · {codeStats.characters} chars
              </span>
              <div className="flex gap-2 border-l border-black/10 dark:border-white/10 pl-3">
                <button title="Copy code" onClick={handleCopyCode} className="hover:text-primary transition-colors p-1">
                  <FiClipboard size={13} />
                </button>
                {!isReviewMode && (
                  <button
                    title="Reset to starter"
                    onClick={() => setCodeSnippet(defaultStarterByLanguage[language] ?? defaultStarterByLanguage.javascript)}
                    className="hover:text-primary transition-colors p-1"
                  >
                    <FiRefreshCw size={13} />
                  </button>
                )}
                <button
                  title={isMaximized ? "Minimize Editor" : "Maximize Editor"}
                  onClick={() => {
                    const next = !isMaximized;
                    setIsMaximized(next);
                    if (next) updateBottomCollapsed(true);
                  }}
                  className="hover:text-primary transition-colors p-1"
                >
                  {isMaximized ? <FiMinimize2 size={13} /> : <FiMaximize2 size={13} />}
                </button>
              </div>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeEditor
              value={codeSnippet}
              onChange={(value) => !isReviewMode && setCodeSnippet(value ?? "")}
              language={LANGUAGE_MAP[language]?.monacoLang ?? language}
              isDark={isDark}
              readOnly={isReviewMode}
            />
          </div>

          {/* Console (test / result) */}
          <div
            className="relative flex flex-col border-t border-black/10 dark:border-white/10 shrink-0"
            style={{ height: bottomCollapsed ? "auto" : `${bottomHeight}px` }}
          >
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
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/10 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateBottomCollapsed((c) => !c)}
                  className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                  {bottomCollapsed ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                  Console
                </button>
                {[
                  { key: "input", label: "Testcase" },
                  { key: "output", label: "Test Result" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setBottomTab(key); updateBottomCollapsed(false); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      !bottomCollapsed && bottomTab === key ? "text-primary" : "text-secondary hover:text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRun}
                disabled={running || cooldown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 border border-black/10 dark:border-white/10 hover:bg-white/5 text-primary"
              >
                {running ? (
                  <FiRefreshCw size={11} className="animate-spin" />
                ) : (
                  <FiPlay size={11} className="text-green-400" />
                )}
                {running ? "Running…" : "Run"}
              </button>
            </div>

            {/* Console body */}
            {!bottomCollapsed && (
              <div className="flex-1 min-h-0 overflow-hidden">
                {bottomTab === "input" ? (
                  <div className="h-full flex flex-col px-3 py-2 gap-2 overflow-y-auto">
                    {challenge.testCases?.length > 0 ? (
                      <>
                        <div className="flex gap-1 flex-wrap shrink-0">
                          {challenge.testCases.map((tc, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedCaseIdx(i);
                                const hasFunction = !!challenge?.functionName;
                                const isSupportedDriver = language === "python" || language === "javascript"
                                  || isDrivableSignature(language, challenge?.params, challenge?.returnType);
                                setStdin(
                                  hasFunction && isSupportedDriver
                                    ? argsToJsonStdin(tc.args)
                                    : argsToStdin(tc.args),
                                );
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
                        {(() => {
                          const tc = challenge.testCases[selectedCaseIdx];
                          if (!tc) return null;
                          const hasFunction = !!challenge?.functionName;
                          const isSupportedDriver = language === "python" || language === "javascript"
                            || isDrivableSignature(language, challenge?.params, challenge?.returnType);
                          const inputStr =
                            hasFunction && isSupportedDriver
                              ? argsToJsonStdin(tc.args)
                              : argsToStdin(tc.args);
                          return (
                            <div className="flex gap-2 shrink-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Input</p>
                                <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1.5 text-primary whitespace-pre-wrap break-all">
                                  {inputStr || "(empty)"}
                                </pre>
                              </div>
                              {tc.expected && (
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Expected</p>
                                  <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1.5 text-primary whitespace-pre-wrap break-all">
                                    {displayExpected(tc.expected)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="shrink-0">
                          <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Custom stdin</p>
                          <textarea
                            className="w-full resize-none bg-black/5 dark:bg-white/5 rounded-md px-2 py-1.5 text-xs font-mono text-primary placeholder:text-secondary/40 focus:outline-none"
                            rows={2}
                            placeholder="Override stdin for a custom run…"
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                            spellCheck={false}
                          />
                        </div>
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
                  <div className="h-full overflow-y-auto px-3 py-2 space-y-2">
                    {!runOutput ? (
                      <p className="text-secondary/40 text-xs font-mono">Press Run to see output here…</p>
                    ) : runOutput.error ? (
                      <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{runOutput.error}</pre>
                    ) : (
                      <div className="space-y-3">
                        {runOutput.cases.map((c, i) => {
                          const hasError = c.compile_output || c.stderr;
                          const matchResult =
                            !hasError &&
                            c.expected != null &&
                            outputsMatch(c.stdout, c.expected, challenge?.orderIndependent);
                          const passed = matchResult === true;
                          const failed = !hasError && c.expected != null && !matchResult;
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
                                      : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-primary">{c.label}</span>
                                {hasError ? (
                                  <span className="text-[10px] font-bold text-red-400">
                                    {c.compile_output ? "Compile Error" : "Runtime Error"}
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
                              {hasError && (
                                <pre className="text-[11px] font-mono text-red-400 whitespace-pre-wrap break-all">
                                  {c.compile_output || c.stderr}
                                </pre>
                              )}
                              {!hasError && (
                                <>
                                  {c.stdinValue != null && (
                                    <div>
                                      <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Input</p>
                                      <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1 text-primary whitespace-pre-wrap break-all">
                                        {c.stdinValue || "(empty)"}
                                      </pre>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Output</p>
                                    <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1 text-primary whitespace-pre-wrap break-all">
                                      {c.stdout || "(no output)"}
                                    </pre>
                                  </div>
                                  {c.expected != null && (
                                    <div>
                                      <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Expected</p>
                                      <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1 text-primary whitespace-pre-wrap break-all">
                                        {displayExpected(c.expected)}
                                      </pre>
                                    </div>
                                  )}
                                  {c.time && (
                                    <p className="text-[10px] text-secondary font-mono">{c.time}s · {c.memory} KB</p>
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

          {/* Review panel */}
          {isReviewMode && (
            <div className="px-4 py-4 border-t border-black/10 dark:border-white/10 shrink-0 space-y-3">
              {reviewQuery.data && (
                <div className="flex flex-col gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent font-bold text-xs">
                      <FiUser size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {reviewQuery.data.userId?.username || "Unknown"}
                      </p>
                      <p className="text-[10px] text-secondary">
                        Submitted {new Date(reviewQuery.data.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    {(() => {
                      const execStats = formatExecStats(reviewQuery.data.execTimeSec, reviewQuery.data.execMemoryKb);
                      return execStats ? (
                        <span className="text-[10px] font-mono text-secondary bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap">
                          ⏱ {execStats.time} · 💾 {execStats.memory}
                        </span>
                      ) : null;
                    })()}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        reviewQuery.data.status === "Pending"
                          ? "bg-yellow-500/15 text-yellow-500"
                          : reviewQuery.data.status === "Accepted"
                            ? "bg-green-500/15 text-green-500"
                            : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {reviewQuery.data.status}
                    </span>
                  </div>
                  {reviewQuery.data.userFeedback && (
                    <div className="pt-2 border-t border-black/10 dark:border-white/10">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
                        Member Note
                      </p>
                      <p className="text-xs text-primary bg-black/10 dark:bg-black/20 p-2.5 rounded-lg border border-black/10 dark:border-white/5 whitespace-pre-wrap">
                        {reviewQuery.data.userFeedback}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {showRejectForm && (
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
                    <FiMessageSquare size={12} />
                    Rejection Feedback
                  </label>
                  <textarea
                    className="w-full rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-3 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-accent transition-colors resize-none"
                    rows={3}
                    placeholder="Explain what can be improved..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleGrade("Accepted")}
                  disabled={grading}
                  className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-green-500/10 text-green-500 text-sm font-bold hover:bg-green-500/20 transition-all disabled:opacity-50 border border-green-500/20"
                >
                  <FiCheck size={16} />
                  {grading ? "Processing..." : "Accept"}
                </button>
                {!showRejectForm ? (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={grading}
                    className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold hover:bg-red-500/20 transition-all disabled:opacity-50 border border-red-500/20"
                  >
                    <FiXCircle size={16} />
                    Reject
                  </button>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <button
                      onClick={() => handleGrade("Rejected")}
                      disabled={grading}
                      className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold hover:bg-red-500/20 transition-all disabled:opacity-50 border border-red-500/20"
                    >
                      <FiXCircle size={16} />
                      {grading ? "Processing..." : "Confirm Reject"}
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setReviewComment(""); }}
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-primary bg-black/5 dark:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {reviewQuery.data?.status === "Accepted" && (
                <div className="flex gap-2 pt-1 border-t border-black/10 dark:border-white/10">
                  {!showRevokeConfirm ? (
                    <button
                      onClick={() => setShowRevokeConfirm(true)}
                      disabled={grading}
                      className="w-full py-2 flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-all disabled:opacity-50 border border-orange-500/20"
                    >
                      <FiRefreshCw size={13} />
                      Revoke Acceptance
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { handleGrade("Pending"); setShowRevokeConfirm(false); }}
                        disabled={grading}
                        className="flex-1 py-2 flex items-center justify-center gap-2 rounded-xl bg-orange-500/15 text-orange-400 text-xs font-bold hover:bg-orange-500/25 transition-all disabled:opacity-50 border border-orange-500/30"
                      >
                        <FiRefreshCw size={13} />
                        {grading ? "Processing..." : "Confirm Revoke"}
                      </button>
                      <button
                        onClick={() => setShowRevokeConfirm(false)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-primary bg-black/5 dark:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeDetails;
