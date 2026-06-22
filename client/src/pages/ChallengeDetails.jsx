import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import {
  FiClipboard,
  FiRefreshCw,
  FiTrash2,
  FiGithub,
  FiCode,
  FiFileText,
  FiClock,
  FiChevronLeft,
  FiSend,
  FiExternalLink,
  FiCheckCircle,
  FiZap,
  FiCheck,
  FiXCircle,
  FiMessageSquare,
  FiUser,
  FiPlay,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

// Monaco & Shared Assets
import CodeEditor from "../components/CodeEditor";
import { LANGUAGE_MAP, LANGUAGE_OPTIONS } from "../constants/languages";

// Local Project Imports
import SkeletonCard from "../components/SkeletonCard";
import { api } from "../lib/api";

import { useAuth } from "../context/useAuth";

// --- JUDGE0 CONFIG ---
const JUDGE0_URL = import.meta.env.VITE_JUDGE0_API_URL || "https://ce.judge0.com";

/**
 * Converts a single test-case arg value to its stdin representation.
 * Arrays → space-separated elements (standard competitive-programming format)
 * so that Java's Scanner.nextInt() / nextLine() can consume them without
 * an InputMismatchException.  Nested arrays produce one line per row.
 */
const formatArgForStdin = (a) => {
  if (a == null) return "";
  if (typeof a === "string") return a;
  if (typeof a === "number" || typeof a === "boolean") return String(a);
  if (Array.isArray(a)) {
    if (a.length > 0 && Array.isArray(a[0])) {
      // 2-D array: each inner array on its own line, space-separated
      return a.map((inner) => (Array.isArray(inner) ? inner.join(" ") : String(inner))).join("\n");
    }
    return a.join(" ");
  }
  return JSON.stringify(a);
};

/**
 * Converts a test-case's `args` field (which may be an array, a single
 * number, a string, etc.) to a multi-line stdin string.
 */
const argsToStdin = (args) => {
  if (args == null) return "";
  const list = Array.isArray(args) ? args : [args];
  return list.map(formatArgForStdin).join("\n");
};

const b64Encode = (str) =>
  btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    ),
  );
const b64Decode = (str) => {
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
const defaultStarterByLanguage = {
  javascript: `function solution() {\n    // read input, compute, print output\n}\n\nsolution();\n`,
  python: `import sys\ninput = sys.stdin.readline\n\ndef solution():\n    pass\n\nsolution()\n`,
  java: `import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    return 0;\n}\n`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    \n    return 0;\n}\n`,
};

const ChallengeDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const reviewSubmissionId = searchParams.get("review");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const draftKey = `challenge-draft:${id}`;

  const isReviewer = ["admin", "super-admin", "clan-chief"].includes(user?.role);
  const isReviewMode = Boolean(reviewSubmissionId) && isReviewer;

  const [repoUrl, setRepoUrl] = useState("");
  const [codeByLang, setCodeByLang] = useState({});
  const [language, setLanguage] = useState(user?.preferredLanguage || "javascript");
  const [submitting, setSubmitting] = useState(false);
  const [leftTab, setLeftTab] = useState("description");
  const [rightTab, setRightTab] = useState("code"); // 'code', 'ai', 'tests'

  // Input / Output panel state (Judge0)
  const [bottomTab, setBottomTab] = useState("input");
  const [stdin, setStdin] = useState("");
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [runOutput, setRunOutput] = useState(null);
  const [running, setRunning] = useState(false);

  // Review mode state
  const [reviewComment, setReviewComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [grading, setGrading] = useState(false);

  // Resizer state
  const [leftWidth, setLeftWidth] = useState(45);
  const containerRef = useRef(null);

  // Bottom (test/result) panel sizing — lets the editor grow when the
  // test-case panel takes up too much vertical space.
  const [bottomHeight, setBottomHeight] = useState(224); // matches old h-56
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute("data-theme") === "dark",
  );

  // Logic: Sync with global Dark Mode toggle
  useEffect(() => {
    const checkDark = () =>
      document.documentElement.getAttribute("data-theme") === "dark" ||
      document.documentElement.classList.contains("dark");
    const observer = new MutationObserver(() => {
      setIsDark(checkDark());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;
      setLeftWidth(newWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  const handleBottomResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bottomHeight;
    const handleMove = (ev) => {
      // Dragging the handle up grows the panel (shrinks the editor); down shrinks it.
      let h = startH - (ev.clientY - startY);
      if (h < 80) h = 80;
      if (h > 520) h = 520;
      setBottomHeight(h);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const setCodeSnippet = (val) => {
    const newVal =
      typeof val === "function" ? val(codeByLang[language] || "") : val;
    setCodeByLang((prev) => ({ ...prev, [language]: newVal }));
  };

  // Logic: LocalStorage Persistence
  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      setRepoUrl(draft.repoUrl || "");
      if (draft.codeByLang) setCodeByLang(draft.codeByLang);
      else if (draft.codeSnippet)
        setCodeByLang({ [draft.language || "javascript"]: draft.codeSnippet });
      setLanguage(draft.language || "javascript");
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    const hasAnyCode = Object.values(codeByLang).some((c) => c.trim());
    if (!(repoUrl.trim() || hasAnyCode)) {
      localStorage.removeItem(draftKey);
      return;
    }
    localStorage.setItem(
      draftKey,
      JSON.stringify({ repoUrl, codeByLang, language }),
    );
  }, [draftKey, repoUrl, codeByLang, language]);

  const challengeQuery = useQuery({
    queryKey: ["challenge", id],
    queryFn: async () => {
      const res = await api.get(`/api/challenges/${id}`);
      return res.data.data;
    },
  });


  const historyQuery = useQuery({
    queryKey: ["my-submissions", id],
    enabled: !isReviewMode,
    queryFn: async () => {
      const res = await api.get(
        `/api/submissions/my-submissions?challengeId=${id}&limit=8`,
      );
      return res.data.data || [];
    },
  });


  // Review mode: fetch the submission being reviewed
  const reviewQuery = useQuery({
    queryKey: ["review-submission", reviewSubmissionId],
    enabled: isReviewMode && Boolean(reviewSubmissionId),
    queryFn: async () => {
      const res = await api.get(`/api/submissions/${reviewSubmissionId}`);
      return res.data.data;
    },
  });

  const submissionsList = historyQuery.data || [];
  const acceptedSub = submissionsList.find(s => s.status === 'Accepted');
  const pendingSub = submissionsList.find(s => s.status === 'Pending');


  // Prefer user's saved edits, then the generic full-program template.
  const codeSnippet = codeByLang[language] ?? defaultStarterByLanguage[language] ?? "";

  // Pre-load submitted code into editor when in review mode
  useEffect(() => {
    if (!isReviewMode || !reviewQuery.data) return;
    const sub = reviewQuery.data;
    if (sub.code) {
      setCodeByLang({ [sub.language || "javascript"]: sub.code });
      setLanguage(sub.language || "javascript");
    }
  }, [isReviewMode, reviewQuery.data]);

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
      navigate(-1);
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

  const handleInsertStarter = () =>
    setCodeSnippet(defaultStarterByLanguage[language] ?? defaultStarterByLanguage.javascript);

  const handleCopyCode = async () => {
    if (!codeSnippet.trim()) return toast.error("No code to copy");
    try {
      await navigator.clipboard.writeText(codeSnippet);
      toast.success("Code copied");
    } catch {
      toast.error("Unable to copy");
    }
  };

  const handleClearDraft = () => {
    setRepoUrl("");
    setCodeByLang({});
    localStorage.removeItem(draftKey);
    toast.success("Draft cleared");
  };

  // --- JUDGE0 RUN LOGIC ---
  const handleRun = async () => {
    if (!codeSnippet.trim()) return toast.error("No code to run.");

    const testCases = challengeQuery.data?.testCases ?? [];

    // Build the list of runs: one per stored test case, or fall back to
    // the current manual stdin if no test cases are defined.
    const runs =
      testCases.length > 0
        ? testCases.map((tc) => ({
          label: tc.label,
          stdinValue: argsToStdin(tc.args),
          expected: tc.expected ?? null,
        }))
        : [{ label: "Run", stdinValue: stdin, expected: null }];

    setRunning(true);
    setRightTab("tests"); // Switch to tests tab to see results
    setRunOutput(null);

    const langId = LANGUAGE_MAP[language]?.id ?? 63;
    // Each case gets a unique nonce comment to force a fresh execution even
    // if Judge0 caches by source-code hash.
    const commentChar = language === "python" ? "#" : "//";
    const freshSource = (idx) =>
      b64Encode(
        `${codeSnippet}\n${commentChar} run:${idx}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );

    try {
      // ── 1. Batch submit: one independent submission per test case ────────────
      const batchRes = await fetch(
        `${JUDGE0_URL}/submissions/batch?base64_encoded=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissions: runs.map((run, idx) => ({
              language_id: langId,
              source_code: freshSource(idx),
              stdin: b64Encode(run.stdinValue),
            })),
          }),
        },
      );
      if (!batchRes.ok) {
        const text = await batchRes.text();
        throw new Error(`Judge0 batch submit error ${batchRes.status}: ${text}`);
      }
      const batchTokens = await batchRes.json();
      const tokens = batchTokens.map((t) => t.token);

      // ── 2. Poll until every submission is finished ───────────────────────────
      const tokenList = tokens.join(",");
      let results = tokens.map(() => null);

      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 1000));
        const pollRes = await fetch(
          `${JUDGE0_URL}/submissions/batch?tokens=${tokenList}&base64_encoded=true`,
        );
        if (!pollRes.ok) continue;
        const { submissions } = await pollRes.json();

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

      // Mark any that timed out
      results = results.map((r, i) =>
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
    } catch (err) {
      toast.error(err.message || "Failed to execute code.");
      setRunOutput({ error: err.message || "Execution engine unreachable." });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!repoUrl && !codeSnippet.trim())
      return toast.error("Please provide code or a GitHub link.");
    setSubmitting(true);
    try {
      await api.post("/api/submissions", {
        challengeId: id,
        repositoryUrl: repoUrl.trim() || undefined,
        code: codeSnippet.trim() || undefined,
        language,
      });
      toast.success("Solution submitted.");
      setRepoUrl("");
      setCodeByLang({});
      localStorage.removeItem(draftKey);
      queryClient.invalidateQueries({ queryKey: ["my-submissions", id] });
      queryClient.invalidateQueries({ queryKey: ["dash-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dash-profile"] });
    } catch (err) {
      toast.error(err.userMessage || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };


  // Sanitize the HTML description
  const sanitizedDescription = useMemo(() => {
    const raw = challengeQuery.data?.description || "";
    return DOMPurify.sanitize(raw, {
      ADD_TAGS: ["img"],
      ADD_ATTR: ["target"],
    });
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
        <button
          className="btn-secondary mt-4"
          onClick={() => navigate("/dashboard")}
        >
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
    <div
      className="flex flex-col w-full h-auto lg:h-[calc(100vh-8rem)]"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-black/10 dark:border-white/10 mb-3 shrink-0 px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-secondary hover:text-primary transition-colors text-sm shrink-0"
          >
            <FiChevronLeft size={16} />
            <span className="hidden sm:inline">Missions</span>
          </Link>
          <div className="w-px h-5 bg-black/10 dark:bg-white/10 shrink-0" />
          <a href={challenge.link} className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate flex items-center gap-2 hover:text-accent transition-colors">
              {challenge.title} <FiExternalLink className="shrink-0" />
            </h1>
          </a>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto shrink-0 flex-wrap sm:justify-end">
          {challenge.tags && challenge.tags.map((tag, idx) => (
            <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/5 text-secondary border border-white/5">
              {tag}
            </span>
          ))}
          {(!challenge.tags || challenge.tags.length === 0) && challenge.category && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/5 text-secondary border border-white/5">
              {challenge.category}
            </span>
          )}
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${difficultyBg} ${difficultyColor}`}
          >
            {challenge.difficulty}
          </span>
          <span className="text-secondary text-sm hidden sm:inline">
            {challenge.points} XP
          </span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div
        ref={containerRef}
        className="flex flex-col lg:flex-row flex-1 min-h-0 w-full relative h-full px-4 sm:px-6 lg:px-8 pb-4"
        style={{ '--left-width': `${leftWidth}%`, '--right-width': `calc(${100 - leftWidth}% - 12px)` }}
      >
        {/* LEFT PANEL */}
        <div className="flex-none lg:flex-none flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden w-full lg:w-[var(--left-width)] lg:mb-0 mb-3 h-[380px] lg:h-full">
          <div className="flex border-b border-black/10 dark:border-white/10 shrink-0">
            <button
              className={`px-4 py-3 text-sm font-semibold relative ${leftTab === "description" ? "text-primary" : "text-secondary"}`}
              onClick={() => setLeftTab("description")}
            >
              <FiFileText className="inline mr-2" />
              Description
              {leftTab === "description" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
            <button
              className={`px-4 py-3 text-sm font-semibold relative ${leftTab === "submissions" ? "text-primary" : "text-secondary"}`}
              onClick={() => setLeftTab("submissions")}
            >
              <FiClock className="inline mr-2" />
              Submissions
              {leftTab === "submissions" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
            <button
              className={`px-4 py-3 text-sm font-semibold relative ${leftTab === "ask" ? "text-primary" : "text-secondary"}`}
              onClick={() => setLeftTab("ask")}
            >
              <FiSend className="inline mr-2" />
              Ask a Doubt
              {leftTab === "ask" && (
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
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${difficultyBg} ${difficultyColor}`}
                  >
                    {challenge.difficulty}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent/10 text-accent">
                    {challenge.points} XP
                  </span>
                  {challenge.tags && challenge.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs font-semibold px-2 py-1 rounded bg-white/5 text-secondary border border-white/5">
                      {tag}
                    </span>
                  ))}
                  {(!challenge.tags || challenge.tags.length === 0) && challenge.category && (
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-white/5 text-secondary border border-white/5">
                      {challenge.category}
                    </span>
                  )}
                </div>
              </div>
            ) : leftTab === "submissions" ? (
              <div className="space-y-3">
                {historyQuery.data?.map((sub) => (
                  <Link
                    key={sub._id}
                    to={`/submission/${sub._id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-black/10 dark:border-white/10 hover:border-accent hover:scale-[99%] transition-all"
                  >
                    <div>
                      <p
                        className={`text-sm font-semibold ${sub.status === "Accepted" ? "text-green-400" : "text-red-400"}`}
                      >
                        {sub.status}
                      </p>
                      <p className="text-secondary text-xs">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-secondary">
                      {sub.language}
                    </span>
                  </Link>
                ))}
              </div>
            ) : leftTab === "ask" ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-xs text-secondary font-bold mb-1">Clan AI Assistant</p>
                    <p className="text-sm text-primary">How can I help you with this challenge?</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <input type="text" className="field-input flex-1" placeholder="Type your doubt here..." />
                  <button className="bg-accent text-white p-2.5 rounded-lg hover:bg-accent/80 transition-colors">
                    <FiSend />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Resizer */}
        <div
          className="hidden lg:flex w-3 cursor-col-resize justify-center items-center group shrink-0 z-10 hover:bg-white/5 transition-colors"
          onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-16 bg-white/10 group-hover:bg-accent rounded-full transition-colors" />
        </div>

        {/* RIGHT PANEL - Editor / AI / Tests */}
        <div className="flex-none lg:flex-none flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden border border-white/5 w-full lg:w-[var(--right-width)] h-[580px] lg:h-full">
          <div className="flex items-center justify-between pr-4 border-b border-black/10 dark:border-white/10 shrink-0">
            <div className="flex">
              <button className={`px-4 py-3 text-sm font-semibold relative ${rightTab === "code" ? "text-primary" : "text-secondary"}`} onClick={() => setRightTab("code")}>
                <FiCode className="inline mr-2" /> Code
                {rightTab === "code" && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />}
              </button>
              <button className={`px-4 py-3 text-sm font-semibold relative ${rightTab === "ai" ? "text-primary" : "text-secondary"}`} onClick={() => setRightTab("ai")}>
                <FiZap className="inline mr-2" /> AI Review
                {rightTab === "ai" && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />}
              </button>
              <button className={`px-4 py-3 text-sm font-semibold relative ${rightTab === "tests" ? "text-primary" : "text-secondary"}`} onClick={() => setRightTab("tests")}>
                <FiCheckCircle className="inline mr-2" /> Result
                {rightTab === "tests" && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />}
              </button>
            </div>
            {rightTab === "code" && !(!isReviewMode && (acceptedSub || pendingSub)) && (
              <select
                className="bg-black/5 dark:bg-[#1a1a24] border border-black/10 dark:border-white/10 rounded-lg text-xs px-2 py-1 text-primary focus:outline-none"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key} className="bg-white dark:bg-[#1a1a24] text-black dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!isReviewMode && acceptedSub ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center bg-green-500/5">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <FiCheckCircle className="text-3xl text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-green-400 mb-2">Already Attempted & Approved</h2>
              <p className="text-secondary mb-6 max-w-md">You have successfully solved this challenge. Great job!</p>
              <Link
                to={`/submission/${acceptedSub._id}`}
                className="px-6 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
              >
                See My Submission
              </Link>
            </div>
          ) : !isReviewMode && pendingSub ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center bg-yellow-500/5">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                <FiClock className="text-3xl text-yellow-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-yellow-400 mb-2">Pending Review</h2>
              <p className="text-secondary mb-6 max-w-md">Your submission is currently under review by a Clan Chief.</p>
              <Link
                to={`/submission/${pendingSub._id}`}
                className="px-6 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20"
              >
                View Status
              </Link>
            </div>
          ) : (
            <>
              {/* Monaco Editor Instance */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <CodeEditor
                  value={codeSnippet}
                  onChange={(value) => setCodeSnippet(value ?? "")}
                  language={LANGUAGE_MAP[language]?.monacoLang ?? language}
                  isDark={isDark}
                  readOnly={isReviewMode}
                />
              </div>

              {/* ── Test / Result Panel (normal mode only) ── */}
              {!isReviewMode && (
                <div
                  className="relative flex flex-col border-t border-black/10 dark:border-white/10 shrink-0"
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
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/10 dark:border-white/10 shrink-0">
                    <div className="flex gap-0.5">
                      {[
                        { key: "input", label: "Test" },
                        { key: "output", label: "Result" },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => { setBottomTab(key); setBottomCollapsed(false); }}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${bottomTab === key
                            ? "bg-accent/15 text-accent"
                            : "text-secondary hover:text-primary"
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBottomCollapsed((c) => !c)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:text-primary hover:bg-white/5 transition-colors"
                        title={bottomCollapsed ? "Expand panel" : "Collapse panel"}
                      >
                        {bottomCollapsed ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                      </button>
                      <button
                        onClick={handleRun}
                        disabled={running}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/15 text-green-400 text-xs font-bold hover:bg-green-500/25 transition-all disabled:opacity-60 border border-green-500/20"
                      >
                        {running ? (
                          <FiRefreshCw size={11} className="animate-spin" />
                        ) : (
                          <FiPlay size={11} />
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
                                      setStdin(argsToStdin(tc.args));
                                    }}
                                    className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${selectedCaseIdx === i
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
                                const inputStr = argsToStdin(tc.args);
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
                                          {tc.expected}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Editable stdin for custom runs */}
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
                              {runOutput.cases.map((c, i) => {
                                const hasError = c.compile_output || c.stderr;
                                const passed =
                                  !hasError &&
                                  c.expected != null &&
                                  c.stdout?.trim() === c.expected.trim();
                                const failed =
                                  !hasError &&
                                  c.expected != null &&
                                  c.stdout?.trim() !== c.expected.trim();
                                return (
                                  <div
                                    key={i}
                                    className={`rounded-lg border px-3 py-2 space-y-2 ${hasError
                                      ? "border-red-500/30 bg-red-500/5"
                                      : passed
                                        ? "border-green-500/30 bg-green-500/5"
                                        : failed
                                          ? "border-red-500/20 bg-black/5 dark:bg-white/5"
                                          : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
                                      }`}
                                  >
                                    {/* Case header */}
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
                                            <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">Input (stdin)</p>
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
                                              {c.expected}
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
              )}

              {isReviewMode ? (
                /* ---- REVIEW MODE PANEL ---- */
                <div className="px-4 py-4 border-t border-black/10 dark:border-white/10 shrink-0 space-y-4">
                  {/* Submitter info */}
                  {reviewQuery.data && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
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
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${reviewQuery.data.status === "Pending"
                        ? "bg-yellow-500/15 text-yellow-500"
                        : reviewQuery.data.status === "Accepted"
                          ? "bg-green-500/15 text-green-500"
                          : "bg-red-500/15 text-red-500"
                        }`}>
                        {reviewQuery.data.status}
                      </span>
                    </div>
                  )}

                  {/* Reject comment textarea */}
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

                  {/* Action buttons */}
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
                          onClick={() => {
                            setShowRejectForm(false);
                            setReviewComment("");
                          }}
                          className="px-3 py-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-primary bg-black/5 dark:bg-white/5 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ---- NORMAL SUBMIT PANEL ---- */
                <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 shrink-0 space-y-3">

                  {/* Row: language badge + stats + editor action icons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-accent/10 text-accent border border-accent/20">
                        {LANGUAGE_OPTIONS.find((l) => l.key === language)?.label ?? language}
                      </span>
                      <span className="text-[11px] text-secondary">
                        {codeStats.lines} lines · {codeStats.characters} chars
                      </span>
                    </div>
                    <div className="flex gap-3 text-secondary">
                      <button title="Reset to starter" onClick={handleInsertStarter} className="hover:text-primary transition-colors">
                        <FiRefreshCw size={13} />
                      </button>
                      <button title="Copy code" onClick={handleCopyCode} className="hover:text-primary transition-colors">
                        <FiClipboard size={13} />
                      </button>
                      <button title="Clear draft" onClick={handleClearDraft} className="hover:text-primary transition-colors">
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* GitHub repo URL (optional) */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus-within:border-accent transition-colors">
                    <FiGithub size={14} className="text-secondary shrink-0" />
                    <input
                      name="submissionRepositoryUrl"
                      type="url"
                      placeholder="GitHub repository URL (optional)"
                      className="bg-transparent text-sm text-primary placeholder-white/25 focus:outline-none w-full"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleRun}
                      disabled={running}
                      className="btn-secondary flex-1 py-2.5 flex items-center justify-center gap-2 text-xs"
                    >
                      <FiPlay size={13} /> {running ? "Running..." : "Run Code"}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                    >
                      <FiSend size={13} /> {submitting ? "Transmitting..." : "Submit Solution"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengeDetails;
