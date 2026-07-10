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
  FiGithub,
  FiCode,
  FiFileText,
  FiClock,
  FiChevronLeft,
  FiSend,
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
  FiInfo,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";

// Monaco & Shared Assets
import CodeEditor from "../components/CodeEditor";
import { LANGUAGE_MAP, LANGUAGE_OPTIONS } from "../constants/languages";

// Local Project Imports
import SkeletonCard from "../components/SkeletonCard";
import { api } from "../lib/api";
import { argsToJsonStdin, wrapWithDriver, isDrivableSignature } from "../lib/leetcodeDriver";
import { MANUAL_TOPICS } from "../constants/manualContent";
import FeedbackDialog from "../components/FeedbackDialog";

import { useAuth } from "../context/useAuth";

/**
 * Normalize output for comparison:
 * 1. Trim leading/trailing whitespace
 * 2. Collapse all internal whitespace
 * 3. Normalize cross-language literals (Python's True/False/None → true/false/null)
 */
const LANG_LITERALS = { True: "true", False: "false", None: "null" };

const decodeHtmlEntities = (str) => {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
};

const normalizeOutput = (s) => {
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
const displayExpected = (val) => {
  if (!val) return val;
  let decoded = decodeHtmlEntities(val).trim();
  if (decoded.startsWith('"') && decoded.endsWith('"') && decoded.length >= 2) {
    decoded = decoded.slice(1, -1);
  }
  return decoded;
};

/**
 * Converts a single test-case arg value to its stdin representation.
 * Arrays → length on first line, then space-separated elements.
 * Nested arrays → row count, then each inner array as "length elements..."
 * This matches the standard competitive-programming format expected by
 * Java's Scanner and C++ cin.
 */
const formatArgForStdin = (a) => {
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

  const isReviewer = ["admin", "super-admin", "clan-chief"].includes(
    user?.role,
  );
  const isReviewMode = Boolean(reviewSubmissionId) && isReviewer;

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

  const submitToServer = async (userFeedbackVal) => {
    setSubmitting(true);
    try {
      await api.post("/api/submissions", {
        challengeId: id,
        repositoryUrl: repoUrl.trim() || undefined,
        code: codeSnippet.trim() || undefined,
        language,
        userFeedback: userFeedbackVal || undefined,
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
      const allPassed =
        !hasError &&
        results.every(
          (c) =>
            c.expected != null && normalizeOutput(c.stdout) === normalizeOutput(c.expected),
        );

      if (allPassed) {
        toast.success("All test cases passed! Submitting solution...");
        await submitToServer();
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
    <div className="flex flex-col w-full challenge-details-theme min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1 border-b border-black/10 dark:border-white/10 mb-1.5 shrink-0 px-3 pt-1.5">
        <Link
          to={isReviewMode ? "/chief-panel?tab=review" : "/dashboard"}
          className="flex items-center gap-1 text-secondary hover:text-primary transition-colors text-xs"
        >
          <FiChevronLeft size={14} />
          <span className="hidden sm:inline">{isReviewMode ? "Code Reviews" : "Missions"}</span>
        </Link>
        <div className="w-px h-4 bg-black/10 dark:bg-white/10" />
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
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${difficultyBg} ${difficultyColor}`}
          >
            {challenge.difficulty}
          </span>
          <span className="text-secondary text-xs hidden sm:inline">
            {challenge.points} XP
          </span>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden mb-2 px-2 shrink-0">
        <div className="flex w-full bg-black/10 dark:bg-white/10 rounded-lg p-1 gap-1">
          <button
            className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${mobileTab === 'description' ? 'bg-accent text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
            onClick={() => setMobileTab('description')}
          >
            Mission Details
          </button>
          <button
            className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-all ${mobileTab === 'editor' ? 'bg-accent text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
            onClick={() => setMobileTab('editor')}
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
          className={`flex-1 lg:flex-none flex-col min-h-0 macos-glass rounded-xl overflow-hidden w-full lg:w-[var(--left-width)] lg:mb-0 mb-3 h-full panel-slide-left ${isMaximized ? "hidden" : ""} ${mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'}`}
        >
          <div className="flex border-b border-black/10 dark:border-white/10 shrink-0 overflow-x-auto">
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
              className={`px-4 py-3 text-sm font-semibold relative ${leftTab === "solutions" ? "text-primary" : "text-secondary"}`}
              onClick={() => setLeftTab("solutions")}
            >
              <FiCode className="inline mr-2" />
              Solutions
              {leftTab === "solutions" && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
            {leftTab === "manual" && (
              <button
                className="px-4 py-3 text-sm font-semibold relative text-primary flex items-center ml-auto"
                onClick={handleCloseManual}
                title="Close Reference"
              >
                <FiXCircle size={16} className="mr-1" /> Close
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {leftTab === "description" ? (
              <div
                className="leetcode-description"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
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
            ) : leftTab === "solutions" ? (
              <div className="flex flex-col min-h-[520px] space-y-4">
                {solutionEntries.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-primary">Uploaded Solution</p>
                        <p className="text-xs text-secondary">
                          {solutionEntries.length} language{solutionEntries.length === 1 ? "" : "s"} available
                        </p>
                      </div>
                      <div className="w-[150px]">
                        <Select value={solutionLanguage} onValueChange={setSolutionLanguage}>
                          <SelectTrigger className="h-8 text-xs bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {solutionEntries.map((solution) => (
                              <SelectItem key={solution.langSlug} value={solution.langSlug} className="text-xs">
                                {solution.lang || LANGUAGE_OPTIONS.find((opt) => opt.key === solution.langSlug)?.label || solution.langSlug}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex-1 min-h-[460px] overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/40">
                      <CodeEditor
                        value={selectedSolution?.code || "// No solution uploaded for this language."}
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
                    <p className="text-sm font-semibold text-primary">No uploaded solutions yet</p>
                    <p className="text-xs text-secondary mt-1">Solutions added by admins will appear here.</p>
                  </div>
                )}
              </div>
            ) : leftTab === "manual" ? (
              <div className="flex flex-col h-full space-y-4">
                <div className="flex flex-wrap gap-2">
                  {MANUAL_TOPICS.map(topic => (
                    <button
                      key={topic.key}
                      onClick={() => setManualTopic(topic.key)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${manualTopic === topic.key ? "bg-accent border-accent text-white" : "border-black/10 dark:border-white/10 text-secondary hover:text-primary hover:border-black/30 dark:hover:border-white/30"}`}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>
                <div className="flex-1 bg-black/5 dark:bg-black/40 rounded-xl border border-black/10 dark:border-white/5 flex flex-col min-h-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/10 dark:border-white/5 flex items-center justify-between shrink-0 bg-black/5 dark:bg-white/5">
                    <span className="text-sm font-bold text-primary">
                      {MANUAL_TOPICS.find(t => t.key === manualTopic)?.title} ({LANGUAGE_OPTIONS.find(o => o.key === language)?.label})
                    </span>
                    <button
                       onClick={async () => {
                         const snippet = MANUAL_TOPICS.find(t => t.key === manualTopic)?.snippets[language];
                         if(snippet) {
                            await navigator.clipboard.writeText(snippet);
                            toast.success("Snippet copied");
                         } else {
                            toast.error("No snippet to copy");
                         }
                       }}
                       className="p-1.5 text-secondary hover:text-primary transition-colors bg-white/5 rounded-md hover:bg-white/10"
                       title="Copy to clipboard"
                    >
                      <FiClipboard size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <CodeEditor
                      value={MANUAL_TOPICS.find(t => t.key === manualTopic)?.snippets[language] || "// No implementation provided for this language."}
                      language={LANGUAGE_MAP[language]?.monacoLang ?? language}
                      isDark={isDark}
                      readOnly={true}
                    />
                  </div>
                </div>
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
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key} className="text-xs">
                        {opt.label}{opt.version && ` (${opt.version})`}
                      </SelectItem>
                    ))}
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
            {/* Console header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/10 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateBottomCollapsed((c) => !c)}
                  className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition-colors px-2 py-1 rounded hover:bg-white/5"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 border border-black/10 dark:border-white/10 hover:bg-white/5 text-primary"
                >
                  {running ? (
                    <FiRefreshCw size={11} className="animate-spin" />
                  ) : (
                    <FiPlay size={11} className="text-green-400" />
                  )}
                  {running ? "Running…" : "Run"}
                </button>
                {!isReviewMode && (
                  <>
                    {showSubmitAnyway ? (
                      <button
                        onClick={() => setShowFeedbackModal(true)}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-60 bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20"
                      >
                        <FiAlertTriangle size={11} className="text-white animate-pulse" />
                        Submit Anyway
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-60 ${
                          isSolved ? "bg-amber-600 hover:bg-amber-500" : "bg-green-600 hover:bg-green-500"
                        }`}
                      >
                        {submitting ? (
                          <FiRefreshCw size={11} className="animate-spin" />
                        ) : (
                          <FiSend size={11} />
                        )}
                        {submitting ? "Submitting…" : isSolved ? "Re-submit (No XP)" : "Submit"}
                      </button>
                    )}
                  </>
                )}
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
                                <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1.5 text-primary whitespace-pre-wrap break-all">
                                  {inputStr || "(empty)"}
                                </pre>
                              </div>
                              {tc.expected && (
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                                    Expected
                                  </p>
                                  <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1.5 text-primary whitespace-pre-wrap break-all">
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
                          <div className="shrink-0 pt-2 border-t border-black/10 dark:border-white/10">
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
                        {runOutput.cases.map((c, i) => {
                          const hasError = c.compile_output || c.stderr;
                          const passed =
                            !hasError &&
                            c.expected != null &&
                            normalizeOutput(c.stdout) === normalizeOutput(c.expected);
                          const failed =
                            !hasError &&
                            c.expected != null &&
                            normalizeOutput(c.stdout) !== normalizeOutput(c.expected);
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
                                      <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1 text-primary whitespace-pre-wrap break-all">
                                        {c.stdinValue || "(empty)"}
                                      </pre>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                                      Output
                                    </p>
                                    <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1 text-primary whitespace-pre-wrap break-all">
                                      {c.stdout || "(no output)"}
                                    </pre>
                                  </div>
                                  {c.expected != null && (
                                    <div>
                                      <p className="text-[10px] text-secondary uppercase tracking-wider mb-0.5">
                                        Expected
                                      </p>
                                      <pre className="text-xs font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1 text-primary whitespace-pre-wrap break-all">
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
            </div>
          ) : null}
        </div>
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
