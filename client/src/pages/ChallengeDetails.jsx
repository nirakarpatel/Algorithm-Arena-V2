import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import {
  FiClipboard,
  FiRefreshCw,
  FiTrash2,
  FiCode,
  FiChevronLeft,
  FiChevronRight,
  FiSend,
  FiExternalLink,
  FiCheck,
  FiXCircle,
  FiMessageSquare,
  FiUser,
  FiPlay,
  FiMaximize2,
  FiMinimize2,
  FiInfo,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";

// Monaco & Shared Assets
import CodeEditor from "../components/CodeEditor";
import { LANGUAGE_MAP, LANGUAGE_OPTIONS } from "../constants/languages";

// Local Project Imports
import SkeletonCard from "../components/SkeletonCard";
import ProblemPanel from "../components/challenge/ProblemPanel";
import TestResultPanel from "../components/challenge/TestResultPanel";
import { api } from "../lib/api";
import { argsToJsonStdin, wrapWithDriver, isDrivableSignature } from "../lib/leetcodeDriver";
import { decodeReviewQueue, getQueueNav, buildReviewUrl } from "../lib/reviewQueue";
import FeedbackDialog from "../components/FeedbackDialog";
import { getDifficultyRGB } from "../constants/difficulty";

import { useAuth } from "../context/useAuth";
import {
  argsToStdin,
  b64Encode,
  b64Decode,
  outputsMatch,
  defaultStarterByLanguage,
  computeExecStats,
} from "../lib/challengeOutput";

const ChallengeDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const reviewSubmissionId = searchParams.get("review");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const draftKey = `challenge-draft:${id}`;

  const isReviewer = ["admin", "superAdmin", "super-admin", "clan-chief"].includes(
    user?.role,
  );
  const isReviewMode = Boolean(reviewSubmissionId) && isReviewer;
  const queueParam = searchParams.get("queue") || "";
  const reviewQueueList = useMemo(() => decodeReviewQueue(queueParam), [queueParam]);
  const queueNav = useMemo(
    () => getQueueNav(reviewQueueList, reviewSubmissionId),
    [reviewQueueList, reviewSubmissionId],
  );

  const [repoUrl, setRepoUrl] = useState("");
  const [codeByLang, setCodeByLang] = useState({});
  const [language, setLanguage] = useState(
    user?.preferredLanguage || "javascript",
  );
  const [solutionLanguage, setSolutionLanguage] = useState("javascript");
  const [submitting, setSubmitting] = useState(false);
  const [leftTab, setLeftTab] = useState("description");

  // Input / Output panel state (Judge0)
  const [bottomTab, setBottomTab] = useState("input");
  const [stdin, setStdin] = useState("");
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [runOutput, setRunOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const abortControllerRef = useRef(null);
  const [showSubmitAnyway, setShowSubmitAnyway] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);


  // Review mode state
  const [reviewComment, setReviewComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [grading, setGrading] = useState(false);

  // Manual state
  const [manualTopic, setManualTopic] = useState("io");
  const [mobileTab, setMobileTab] = useState("description"); // "description" or "editor"

  // Resizer state
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem("challenge-left-width");
    return saved ? parseFloat(saved) : 45;
  });
  const containerRef = useRef(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [wasMaximized, setWasMaximized] = useState(false);

  const handleOpenManual = () => {
    if (isMaximized) {
      setWasMaximized(true);
      setIsMaximized(false);
    }
    setLeftTab("manual");
  };

  const handleCloseManual = () => {
    setLeftTab("description");
    if (wasMaximized) {
      setIsMaximized(true);
      setWasMaximized(false);
    }
  };

  // Bottom (test/result) panel sizing — lets the editor grow when the
  // test-case panel takes up too much vertical space.
  const [bottomHeight, setBottomHeight] = useState(() => {
    const saved = localStorage.getItem("challenge-bottom-height");
    return saved ? parseInt(saved, 10) : 224;
  }); // matches old h-56
  const [bottomCollapsed, setBottomCollapsed] = useState(() => {
    const saved = localStorage.getItem("challenge-bottom-collapsed");
    return saved === "true";
  });

  const updateBottomCollapsed = (val) => {
    setBottomCollapsed((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      localStorage.setItem("challenge-bottom-collapsed", String(next));
      return next;
    });
  };

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

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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
      localStorage.setItem("challenge-left-width", String(newWidth));
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

  const challengeQuery = useQuery({
    queryKey: ["challenge", id],
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const res = await api.get(`/api/challenges/${id}`);
        return res.data.data;
      } catch (err) {
        if (err.response?.status === 404) {
          localStorage.removeItem(draftKey);
        }
        throw err;
      }
    },
  });

  useEffect(() => {
    const hasAnyCode = Object.values(codeByLang).some((c) => c.trim());
    if (!(repoUrl.trim() || hasAnyCode)) {
      localStorage.removeItem(draftKey);
      return;
    }
    const challenge = challengeQuery.data;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        repoUrl,
        codeByLang,
        language,
        challengeTitle: challenge?.title,
        challengeDifficulty: challenge?.difficulty,
        challengePoints: challenge?.points,
        updatedAt: new Date().toISOString(),
      }),
    );
  }, [draftKey, repoUrl, codeByLang, language, challengeQuery.data]);

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

  const isSolved = useMemo(() => (historyQuery.data || []).some(sub => sub.status === "Accepted"), [historyQuery.data]);

  // Review mode: fetch the submission being reviewed
  const reviewQuery = useQuery({
    queryKey: ["review-submission", reviewSubmissionId],
    enabled: isReviewMode && Boolean(reviewSubmissionId),
    queryFn: async () => {
      const res = await api.get(`/api/submissions/${reviewSubmissionId}`);
      return res.data.data;
    },
  });

  // Prefer user's saved edits, then the LeetCode snippet if available, then the generic template.
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
    setShowSubmitAnyway(false);
  }, [codeSnippet, language, repoUrl]);

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
        feedback:
          status === "Rejected" ? reviewComment.trim() || undefined : undefined,
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
        // Queue exhausted (or no queue) — return to the Review Submissions tab.
        // Not history back — the chief panel switches tabs via local state, so
        // navigate(-1) can land on the default tab instead.
        navigate("/chief-panel?tab=review");
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

  const handleInsertStarter = () =>
    setCodeSnippet(
      defaultStarterByLanguage[language] ?? defaultStarterByLanguage.javascript,
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

  const handleClearDraft = () => {
    setRepoUrl("");
    setCodeByLang({});
    localStorage.removeItem(draftKey);
    toast.success("Draft cleared");
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
            stdinValue: (hasFunction && isSupportedDriver) ? argsToJsonStdin(tc.args) : argsToStdin(tc.args),
            expected: tc.expected ?? null,
          }))
        : [{ label: "Run", stdinValue: stdin, expected: null }];

    const langId = LANGUAGE_MAP[language]?.id ?? 63;
    const commentChar = language === "python" ? "#" : "//";
    const finalSourceCode = (hasFunction && isSupportedDriver)
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
      { signal }
    );
    const batchTokens = batchRes.data;
    const tokens = batchTokens.map((t) => t.token);

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

      const pollRes = await api.get(
        `/api/submissions/run/batch?tokens=${tokenList}`,
        { signal }
      );
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
    if (cooldown) return toast.error("Please wait a moment between code runs.");

    setRunning(true);
    updateBottomCollapsed(false);
    setBottomTab("output");
    setRunOutput(null);

    // Cancel any ongoing run request or polling loop
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await runTestCases(controller.signal);
    } catch (err) {
      if (err.name === "AbortError" || err.message === "Aborted") {
        console.log("Run execution aborted.");
        return;
      }
      toast.error(err.response?.data?.message || err.message || "Failed to execute code.");
      setRunOutput({ error: err.response?.data?.message || err.message || "Execution engine unreachable." });
    } finally {
      setRunning(false);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 3000);
    }
  };

  const submitToServer = async (userFeedbackVal, stats) => {
    setSubmitting(true);
    try {
      await api.post("/api/submissions", {
        challengeId: id,
        repositoryUrl: repoUrl.trim() || undefined,
        code: codeSnippet.trim() || undefined,
        language,
        userFeedback: userFeedbackVal || undefined,
        ...(stats || {}),
      });
      toast.success("Solution submitted.");
      setRepoUrl("");
      setCodeByLang({});
      localStorage.removeItem(draftKey);
      setShowSubmitAnyway(false);
      setShowFeedbackModal(false);
      queryClient.invalidateQueries({ queryKey: ["my-submissions", id] });
      queryClient.invalidateQueries({ queryKey: ["dash-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dash-profile"] });
    } catch (err) {
      toast.error(err.response?.data?.message || err.userMessage || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!repoUrl && !codeSnippet.trim())
      return toast.error("Please provide code or a GitHub link.");

    if (!codeSnippet.trim()) {
      await submitToServer();
      return;
    }

    setSubmitting(true);
    updateBottomCollapsed(false);
    setBottomTab("output");
    setRunOutput(null);

    try {
      const results = await runTestCases();
      const hasError = results.some((c) => c.compile_output || c.stderr);
      const orderIndependent = challengeQuery.data?.orderIndependent;
      const allPassed =
        !hasError &&
        results.every(
          (c) => c.expected != null && outputsMatch(c.stdout, c.expected, orderIndependent),
        );
      const stats = computeExecStats(results);

      if (allPassed) {
        toast.success("All test cases passed! Submitting solution...");
        await submitToServer(undefined, stats);
      } else {
        setShowSubmitAnyway(true);
        toast.error("Some test cases failed. You can choose to Submit Anyway.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to run verification tests.");
      setShowSubmitAnyway(true);
    } finally {
      setSubmitting(false);
    }
  };

  const challenge = challengeQuery.data;
  const solutionEntries = useMemo(
    () => (challenge?.solutions || []).filter((solution) => solution.code?.trim()),
    [challenge],
  );

  useEffect(() => {
    if (solutionEntries.length === 0) return;
    if (solutionEntries.some((solution) => solution.langSlug === solutionLanguage)) return;

    const matchingEditorLanguage = solutionEntries.find(
      (solution) => solution.langSlug === language,
    );
    setSolutionLanguage(
      matchingEditorLanguage?.langSlug || solutionEntries[0].langSlug || "javascript",
    );
  }, [language, solutionEntries, solutionLanguage]);

  const selectedSolution = useMemo(
    () => solutionEntries.find((solution) => solution.langSlug === solutionLanguage),
    [solutionEntries, solutionLanguage],
  );

  // Sanitize the HTML description
  const sanitizedDescription = useMemo(() => {
    const raw = challenge?.description || "";
    return DOMPurify.sanitize(raw, {
      ADD_TAGS: ["img"],
      ADD_ATTR: ["target"],
    });
  }, [challenge?.description]);

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

  const diffRgb = getDifficultyRGB(challenge.difficulty);
  const statusChip = isReviewMode
    ? reviewQuery.data?.status
    : isSolved
      ? "Solved"
      : null;

  const renderRunButton = (extra = "") => (
    <button
      onClick={handleRun}
      disabled={running || cooldown}
      className={`items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 border border-subtle hover:bg-white/5 text-primary ${extra}`}
    >
      {running ? (
        <FiRefreshCw size={11} className="animate-spin" />
      ) : (
        <FiPlay size={11} className="text-green-400" />
      )}
      {running ? "Running…" : "Run"}
    </button>
  );

  const renderSubmitButton = (extra = "") => {
    if (isReviewMode) return null;
    return showSubmitAnyway ? (
      <button
        onClick={() => setShowFeedbackModal(true)}
        disabled={submitting}
        className={`items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-60 bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 ${extra}`}
      >
        <FiAlertTriangle size={11} className="text-white animate-pulse" />
        Submit Anyway
      </button>
    ) : (
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={`items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-60 ${
          isSolved ? "bg-amber-600 hover:bg-amber-500" : "bg-green-600 hover:bg-green-500"
        } ${extra}`}
      >
        {submitting ? (
          <FiRefreshCw size={11} className="animate-spin" />
        ) : (
          <FiSend size={11} />
        )}
        {submitting ? "Submitting…" : isSolved ? "Re-submit (No XP)" : "Submit"}
      </button>
    );
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1 border-b border-subtle mb-1.5 shrink-0 px-3 pt-1.5 sticky top-16 z-30 surface-overlay">
        <Link
          to={isReviewMode ? "/chief-panel?tab=review" : "/dashboard"}
          className="flex items-center gap-1 text-secondary hover:text-primary transition-colors text-xs"
        >
          <FiChevronLeft size={14} />
          <span className="hidden sm:inline">{isReviewMode ? "Code Reviews" : "Missions"}</span>
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
        <a
          href={challenge.link || `https://leetcode.com/problems/${challenge.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <h1 className="text-sm sm:text-base font-bold truncate flex flex-row items-center gap-1.5 hover:text-accent transition-colors">
            {challenge.title} <FiExternalLink size={12} />
          </h1>
        </a>

        <div className="flex items-center gap-1.5 ml-auto shrink-0 flex-wrap justify-end">
          {challenge.tags &&
            challenge.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-secondary border border-white/5"
              >
                {tag}
              </span>
            ))}
          {(!challenge.tags || challenge.tags.length === 0) &&
            challenge.category && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-secondary border border-white/5">
                {challenge.category}
              </span>
            )}
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ color: `rgb(${diffRgb})`, backgroundColor: `rgba(${diffRgb}, 0.15)` }}
          >
            {challenge.difficulty}
          </span>
          <span className="text-secondary text-xs hidden sm:inline">
            {challenge.points} XP
          </span>
          {statusChip && (
            <span
              className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full ${
                statusChip === "Accepted" || statusChip === "Solved"
                  ? "bg-green-500/15 text-green-500"
                  : statusChip === "Rejected"
                    ? "bg-red-500/15 text-red-500"
                    : "bg-yellow-500/15 text-yellow-500"
              }`}
            >
              {statusChip}
            </span>
          )}
          {renderSubmitButton("hidden lg:inline-flex")}
        </div>
      </div>

      {/* Main Split Layout */}
      <div
        ref={containerRef}
        className="flex flex-col lg:flex-row flex-1 min-h-0 w-full relative h-full px-1 pb-20 lg:pb-1"
        style={{
          "--left-width": `${leftWidth}%`,
          "--right-width": `calc(${100 - leftWidth}% - 12px)`,
        }}
      >
        {/* LEFT PANEL */}
        <ProblemPanel
          isMaximized={isMaximized}
          mobileTab={mobileTab}
          leftTab={leftTab}
          setLeftTab={setLeftTab}
          handleCloseManual={handleCloseManual}
          sanitizedDescription={sanitizedDescription}
          historyData={historyQuery.data}
          solutionEntries={solutionEntries}
          solutionLanguage={solutionLanguage}
          setSolutionLanguage={setSolutionLanguage}
          selectedSolution={selectedSolution}
          isDark={isDark}
          manualTopic={manualTopic}
          setManualTopic={setManualTopic}
          language={language}
        />

        {/* Resizer */}
        <div
          className={`hidden lg:flex w-3 cursor-col-resize justify-center items-center group shrink-0 z-10 hover:bg-white/5 transition-colors ${isMaximized ? "lg:hidden" : ""}`}
          onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-16 bg-white/10 group-hover:bg-accent rounded-full transition-colors" />
        </div>

        {/* RIGHT PANEL - Editor + Console */}
        <div
          className={`flex-1 lg:flex-none flex-col min-h-0 macos-glass rounded-xl overflow-hidden border border-white/5 w-full panel-slide-right ${isMaximized ? "lg:w-full" : "lg:w-[var(--right-width)]"} h-full ${mobileTab === 'description' ? 'hidden lg:flex' : 'flex'}`}
        >
          {/* Editor header: language select + utility buttons */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <FiCode size={13} className="text-accent" />
              <div className="w-[120px]">
                <Select value={language} onValueChange={(val) => setLanguage(val)}>
                  <SelectTrigger className="h-7 text-xs bg-transparent border-none focus:ring-0 px-2 py-0 font-semibold text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((opt) => {
                      const runnable = isLanguageRunnable(opt.key);
                      return (
                        <SelectItem
                          key={opt.key}
                          value={opt.key}
                          disabled={!runnable}
                          className="text-xs"
                        >
                          {opt.label}{opt.version && ` (${opt.version})`}{!runnable && " — no runner"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <button
                title="Open Reference Manual"
                onClick={handleOpenManual}
                className="text-secondary hover:text-accent transition-colors ml-1 p-1 flex items-center justify-center"
              >
                <FiInfo size={13} />
              </button>
            </div>
            <div className="flex items-center gap-3 text-secondary">
              <span className="text-[11px] hidden sm:inline">
                {codeStats.lines} lines · {codeStats.characters} chars
              </span>
              <div className="flex gap-2 border-l border-black/10 dark:border-white/10 pl-3">
                <button
                  title="Reset to starter"
                  onClick={handleInsertStarter}
                  className="hover:text-primary transition-colors p-1"
                >
                  <FiRefreshCw size={13} />
                </button>
                <button
                  title="Copy code"
                  onClick={handleCopyCode}
                  className="hover:text-primary transition-colors p-1"
                >
                  <FiClipboard size={13} />
                </button>
                <button
                  title="Clear draft"
                  onClick={handleClearDraft}
                  className="hover:text-primary transition-colors p-1"
                >
                  <FiTrash2 size={13} />
                </button>
                <button
                  title={isMaximized ? "Minimize Editor" : "Maximize Editor"}
                  onClick={() => {
                    const nextMaximized = !isMaximized;
                    setIsMaximized(nextMaximized);
                    setWasMaximized(false);
                    if (nextMaximized) {
                      updateBottomCollapsed(true);
                    }
                  }}
                  className="hover:text-primary transition-colors p-1"
                >
                  {isMaximized ? (
                    <FiMinimize2 size={13} />
                  ) : (
                    <FiMaximize2 size={13} />
                  )}
                </button>
              </div>
            </div>
          </div>

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

          {/* ── Test / Result Panel ── */}
          <TestResultPanel
            bottomCollapsed={bottomCollapsed}
            bottomHeight={bottomHeight}
            handleBottomResize={handleBottomResize}
            updateBottomCollapsed={updateBottomCollapsed}
            bottomTab={bottomTab}
            setBottomTab={setBottomTab}
            handleRun={handleRun}
            running={running}
            cooldown={cooldown}
            isReviewMode={isReviewMode}
            challenge={challenge}
            selectedCaseIdx={selectedCaseIdx}
            setSelectedCaseIdx={setSelectedCaseIdx}
            language={language}
            stdin={stdin}
            setStdin={setStdin}
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            runOutput={runOutput}
          />

          {isReviewMode ? (
            /* ---- REVIEW MODE PANEL ---- */
            <div className="px-4 py-4 border-t border-black/10 dark:border-white/10 shrink-0 space-y-4">
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
                        Submitted{" "}
                        {new Date(reviewQuery.data.submittedAt).toLocaleString()}
                      </p>
                    </div>
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
                    <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">User Feedback (Submitted Anyway)</p>
                      <p className="text-xs text-primary bg-black/10 dark:bg-black/20 p-2.5 rounded-lg border border-black/10 dark:border-white/5 whitespace-pre-wrap">
                        {reviewQuery.data.userFeedback}
                      </p>
                    </div>
                  )}
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
          ) : null}
        </div>
      </div>

      {/* Mobile action bar */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 surface-overlay border-t border-subtle px-4 py-3 flex items-center gap-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex bg-black/10 dark:bg-white/10 rounded-lg p-1 gap-1 shrink-0">
          <button
            className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${mobileTab === "description" ? "bg-accent text-white shadow-lg" : "text-secondary hover:text-primary"}`}
            onClick={() => setMobileTab("description")}
          >
            Problem
          </button>
          <button
            className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${mobileTab === "editor" ? "bg-accent text-white shadow-lg" : "text-secondary hover:text-primary"}`}
            onClick={() => setMobileTab("editor")}
          >
            Code
          </button>
        </div>
        {renderRunButton("flex flex-1")}
        {renderSubmitButton("flex flex-1")}
      </div>

      <FeedbackDialog
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={submitToServer}
        isSubmitting={submitting}
      />
    </div>
  );
};

export default ChallengeDetails;
