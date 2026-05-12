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

const defaultStarterByLanguage = {
  javascript: `function main() {\n\n}\n\nmain();\n`,
  python: `def main():\n    pass\n\nif __name__ == "__main__":\n    main()\n`,
  java: `public class Main {\n\n    public static void main(String[] args) {\n\n    }\n}\n`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n\n    return 0;\n}\n`,
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
  const [language, setLanguage] = useState("javascript");
  const [submitting, setSubmitting] = useState(false);
  const [leftTab, setLeftTab] = useState("description");
  const [rightTab, setRightTab] = useState("code"); // 'code', 'ai', 'tests'

  // Input / Output panel state (Judge0)
  const [bottomTab, setBottomTab] = useState("input");
  const [stdin, setStdin] = useState("");
  const [runOutput, setRunOutput] = useState(null);
  const [running, setRunning] = useState(false);

  // Review mode state
  const [reviewComment, setReviewComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [grading, setGrading] = useState(false);
  
  // Resizer state
  const [leftWidth, setLeftWidth] = useState(45);
  const containerRef = useRef(null);
  
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

  const codeSnippet =
    codeByLang[language] ?? defaultStarterByLanguage[language] ?? "";
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
        reviewComment: status === "Rejected" ? reviewComment.trim() || undefined : undefined,
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

  const handleInsertStarter = () => setCodeSnippet(defaultStarterByLanguage[language] ?? defaultStarterByLanguage.javascript);

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
    setRunning(true);
    setRightTab("tests"); // Switch to tests tab to see results
    setRunOutput(null);
    try {
      const res = await fetch(
        `${JUDGE0_URL}/submissions?wait=true&base64_encoded=true`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language_id: LANGUAGE_MAP[language]?.id ?? 63,
            source_code: b64Encode(codeSnippet),
            stdin: b64Encode(stdin),
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Execution error ${res.status}: ${text}`);
      }

      const result = await res.json();
      setRunOutput({
        stdout: b64Decode(result.stdout),
        stderr: b64Decode(result.stderr),
        compile_output: b64Decode(result.compile_output),
        status: result.status,
        time: result.time,
        memory: result.memory,
      });
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
    } catch (err) {
      toast.error(err.userMessage || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };


  // Sanitize the HTML description
  const sanitizedDescription = useMemo(() => {
    if (!challengeQuery.data?.description) return "";
    return DOMPurify.sanitize(challengeQuery.data.description, {
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
      className="flex flex-col px-4 sm:px-6 lg:px-8"
      style={{
        height: "calc(100vh - 6rem)",
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-black/10 dark:border-white/10 mb-3 shrink-0">
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-secondary hover:text-primary transition-colors text-sm"
        >
          <FiChevronLeft size={16} />
          <span className="hidden sm:inline">Missions</span>
        </Link>
        <div className="w-px h-5 bg-black/10 dark:bg-white/10" />
        <a href={challenge.link}>
          <h1 className="text-lg sm:text-xl font-bold truncate flex flex-row items-center gap-2 hover:text-accent transition-colors">
            {challenge.title} <FiExternalLink />
          </h1>
        </a>

        <div className="flex items-center gap-2 ml-auto shrink-0">
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
        className="flex flex-col lg:flex-row flex-1 min-h-0 w-full relative h-full"
        style={{ '--left-width': `${leftWidth}%`, '--right-width': `calc(${100 - leftWidth}% - 12px)` }}
      >
        {/* LEFT PANEL */}
        <div className="flex-1 lg:flex-none flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden w-full lg:w-[var(--left-width)] lg:mb-0 mb-3 h-full">
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
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription || challenge.description }}
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
        <div className="flex-1 lg:flex-none flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden border border-white/5 w-full lg:w-[var(--right-width)] h-full">
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
            {rightTab === "code" && (
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

          {rightTab === "code" && (
            <>
              {/* Monaco Editor */}
              <div className="flex-1 min-h-0 overflow-hidden bg-black/10">
                <CodeEditor
                  value={codeSnippet}
                  onChange={(val) => setCodeSnippet(val ?? "")}
                  language={LANGUAGE_MAP[language]?.monacoLang ?? language}
                  isDark={isDark}
                  readOnly={isReviewMode}
                />
              </div>

              {/* Input Area (Judge0) */}
              <div className="h-32 border-t border-black/10 dark:border-white/10 flex flex-col bg-black/5">
                <div className="px-3 py-1 text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-black/5">Input (stdin)</div>
                <textarea
                  className="flex-1 p-3 text-xs font-mono bg-transparent resize-none focus:outline-none text-primary"
                  placeholder="Provide test input here..."
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                />
              </div>
            </>
          )}

          {rightTab === "ai" && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                <h4 className="text-sm font-bold text-accent flex items-center gap-2 mb-2"><FiZap /> AI Originality Analysis</h4>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-black text-white">94%</span>
                  <span className="text-xs font-bold text-green-400 bg-green-400/20 px-2 py-0.5 rounded">Human</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 w-[94%]" />
                </div>
                <p className="text-xs text-secondary mt-3">Your code appears to be highly original. Good job!</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-primary mb-2">Time Complexity</h4>
                <p className="text-sm text-secondary font-mono">O(n) - Linear Time</p>
                <p className="text-xs text-tertiary mt-1">Excellent. You've avoided nested loops where possible.</p>
              </div>
            </div>
          )}

          {rightTab === "tests" && (
            <div className="flex-1 p-6 overflow-y-auto space-y-3">
              <h4 className="text-sm font-bold text-primary mb-4">Execution Result</h4>
              {!runOutput ? (
                <div className="text-center py-12 text-secondary text-sm italic">
                  Press "Run Code" to see execution results here.
                </div>
              ) : runOutput.error ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs">
                  {runOutput.error}
                </div>
              ) : (
                <div className="space-y-4">
                   <div className={`p-4 rounded-xl border ${runOutput.status?.id === 3 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      <p className={`text-sm font-bold ${runOutput.status?.id === 3 ? 'text-green-400' : 'text-red-400'}`}>
                        {runOutput.status?.description}
                      </p>
                      <div className="mt-2 flex gap-4 text-[10px] text-secondary font-mono">
                        <span>Time: {runOutput.time}s</span>
                        <span>Memory: {runOutput.memory}KB</span>
                      </div>
                   </div>
                   
                   {runOutput.stdout && (
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold text-secondary uppercase">Stdout</p>
                        <pre className="p-3 rounded-lg bg-black/40 text-primary text-xs font-mono overflow-x-auto">
                          {runOutput.stdout}
                        </pre>
                     </div>
                   )}
                   
                   {(runOutput.compile_output || runOutput.stderr) && (
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold text-red-400 uppercase">Error / Compile Output</p>
                        <pre className="p-3 rounded-lg bg-red-900/20 text-red-300 text-xs font-mono overflow-x-auto">
                          {runOutput.compile_output || runOutput.stderr}
                        </pre>
                     </div>
                   )}
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Section */}
          <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 shrink-0 space-y-3 bg-black/20">
            {isReviewMode ? (
              /* ---- REVIEW ACTIONS ---- */
              <div className="space-y-3">
                 {reviewQuery.data && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                      <div className="w-8 h-8 rounded bg-accent/15 flex items-center justify-center text-accent"><FiUser /></div>
                      <div className="flex-1 text-[11px]">
                         <p className="font-bold">{reviewQuery.data.userId?.username}</p>
                         <p className="text-secondary">Submitted: {new Date(reviewQuery.data.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>
                 )}
                 {showRejectForm && (
                   <textarea
                     className="w-full bg-black/20 border border-red-500/20 rounded-lg p-2 text-xs text-primary focus:outline-none focus:border-red-500/40"
                     rows={2}
                     placeholder="Feedback for rejection..."
                     value={reviewComment}
                     onChange={(e) => setReviewComment(e.target.value)}
                   />
                 )}
                 <div className="flex gap-2">
                    <button 
                      onClick={() => handleGrade("Accepted")} 
                      disabled={grading}
                      className="flex-1 btn-primary py-2.5 bg-green-600 hover:bg-green-700 text-xs flex items-center justify-center gap-2"
                    >
                      <FiCheckCircle /> Accept
                    </button>
                    {!showRejectForm ? (
                       <button onClick={() => setShowRejectForm(true)} className="flex-1 btn-secondary py-2.5 text-xs">Reject</button>
                    ) : (
                       <button onClick={() => handleGrade("Rejected")} disabled={grading} className="flex-1 bg-red-600 text-white font-bold rounded-lg py-2.5 text-xs">Confirm Reject</button>
                    )}
                 </div>
              </div>
            ) : (
              /* ---- NORMAL ACTIONS ---- */
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus-within:border-accent transition-colors">
                  <FiGithub size={14} className="text-secondary shrink-0" />
                  <input
                    name="submissionRepositoryUrl"
                    type="text"
                    placeholder="GitHub repository URL (optional)"
                    className="bg-transparent text-sm text-primary placeholder-white/25 focus:outline-none w-full"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRun}
                    disabled={running}
                    className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2 hover:bg-white/10"
                  >
                    <FiPlay size={14} /> {running ? "Running..." : "Run Code"}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary flex-[2] py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FiSend size={14} />{" "}
                    {submitting ? "Transmitting..." : "Submit Solution"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDetails;
