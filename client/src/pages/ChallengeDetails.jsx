import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
} from "react-icons/fi";

// CodeMirror Imports
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Local Project Imports
import SkeletonCard from "../components/SkeletonCard";
import { api } from "../lib/api";
import { USE_MOCK, mockChallenges, mockSubmissions } from "../lib/mockData";

// --- THEME & HIGHLIGHT DEFINITIONS ---

const algoArenaDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#bd93f9", fontWeight: "bold" },
  { tag: t.string, color: "#ff6090" },
  { tag: t.variableName, color: "#8be9fd" },
  { tag: t.definition(t.variableName), color: "#f1fa8c" },
  { tag: t.function(t.variableName), color: "#50fa7b" },
  { tag: t.comment, color: "#6272a4", fontStyle: "italic" },
  { tag: t.number, color: "#ffb86c" },
  { tag: t.operator, color: "#44adff" },
]);

const arenaDarkTheme = EditorView.theme(
  {
    "&": { color: "white", backgroundColor: "transparent !important" },
    ".cm-content": {
      caretColor: "#ff6090",
      fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#4b5563",
      border: "none",
    },
    "&.cm-focused .cm-cursor": { borderLeftColor: "#ff6090" },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "#ffffff1a",
    },
  },
  { dark: true },
);

const algoArenaLightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#d73a49", fontWeight: "bold" },
  { tag: t.string, color: "#005cc5" },
  { tag: t.variableName, color: "#24292e" },
  { tag: t.function(t.variableName), color: "#6f42c1" },
  { tag: t.comment, color: "#6a737d", fontStyle: "italic" },
  { tag: t.number, color: "#e36209" },
  { tag: t.operator, color: "#005cc5" },
]);

const arenaLightTheme = EditorView.theme(
  {
    "&": { color: "#24292e", backgroundColor: "white !important" },
    ".cm-gutters": {
      backgroundColor: "#f6f8fa",
      color: "#afb8c1",
      borderRight: "1px solid #d0d7de",
    },
    ".cm-activeLine": { backgroundColor: "#f6f8fa" },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "#add6ff",
    },
  },
  { dark: false },
);

// Fallback starters for challenges without LeetCode snippets
const defaultStarterByLanguage = {
  javascript:
    "function solve(input) {\n  // TODO: implement\n  return input;\n}\n",
  python: "def solve(data):\n    # TODO: implement\n    return data\n",
  java: "class Solution {\n    public static void solve() {\n        // TODO: implement\n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // TODO: implement\n    return 0;\n}\n",
};

// Map LeetCode langSlugs to our editor language keys
const langSlugToEditorLang = {
  javascript: "javascript",
  python3: "python",
  java: "java",
  cpp: "cpp",
};

const ChallengeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draftKey = `challenge-draft:${id}`;

  const [repoUrl, setRepoUrl] = useState("");
  const [codeByLang, setCodeByLang] = useState({});
  const [language, setLanguage] = useState("javascript");
  const [submitting, setSubmitting] = useState(false);
  const [leftTab, setLeftTab] = useState("description");
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

  const codeSnippet = codeByLang[language] || "";
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

  // Logic: Editor Extensions
  const editorExtensions = useMemo(() => {
    const langExt = {
      javascript: [javascript({ jsx: true })],
      python: [python()],
      java: [java()],
      cpp: [cpp()],
    }[language] || [javascript()];

    const themeExt = isDark
      ? [arenaDarkTheme, syntaxHighlighting(algoArenaDarkHighlight)]
      : [arenaLightTheme, syntaxHighlighting(algoArenaLightHighlight)];

    return [...langExt, ...themeExt];
  }, [language, isDark]);

  const challengeQuery = useQuery({
    queryKey: ["challenge", id],
    queryFn: async () => {
      if (USE_MOCK) {
        const found = mockChallenges.find((c) => c._id === id);
        if (!found) throw new Error("Challenge not found");
        return found;
      }
      const res = await api.get(`/api/challenges/${id}`);
      return res.data.data;
    },
  });

  // Logic: Populate editor with starter snippets from DB
  useEffect(() => {
    if (!challengeQuery.data) return;
    // Don't overwrite if user already has a draft saved
    const hasDraft = localStorage.getItem(draftKey);
    if (hasDraft) return;

    const challenge = challengeQuery.data;
    if (challenge.codeSnippets && challenge.codeSnippets.length > 0) {
      const snippetMap = {};
      challenge.codeSnippets.forEach((s) => {
        const editorLang = langSlugToEditorLang[s.langSlug];
        if (editorLang && !snippetMap[editorLang]) {
          snippetMap[editorLang] = s.code;
        }
      });
      setCodeByLang(snippetMap);
    }
  }, [challengeQuery.data, draftKey]);

  const historyQuery = useQuery({
    queryKey: ["my-submissions", id],
    queryFn: async () => {
      if (USE_MOCK)
        return mockSubmissions.filter((s) => s.challengeId._id === id);
      const res = await api.get(
        `/api/submissions/my-submissions?challengeId=${id}&limit=8`,
      );
      return res.data.data || [];
    },
  });

  const codeStats = useMemo(
    () => ({
      lines: codeSnippet ? codeSnippet.split("\n").length : 0,
      characters: codeSnippet.length,
    }),
    [codeSnippet],
  );

  // Build starter code from DB snippets or fall back to defaults
  const getStarterCode = () => {
    const challenge = challengeQuery.data;
    if (challenge?.codeSnippets?.length > 0) {
      const match = challenge.codeSnippets.find(
        (s) => langSlugToEditorLang[s.langSlug] === language,
      );
      if (match) return match.code;
    }
    return defaultStarterByLanguage[language] || defaultStarterByLanguage.javascript;
  };

  const handleInsertStarter = () => setCodeSnippet(getStarterCode());

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

  const handleSubmit = async () => {
    if (!repoUrl && !codeSnippet.trim())
      return toast.error("Please provide code or a GitHub link.");
    setSubmitting(true);
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 600));
      } else {
        await api.post("/api/submissions", {
          challengeId: id,
          repositoryUrl: repoUrl.trim() || undefined,
          code: codeSnippet.trim() || undefined,
          language,
        });
      }
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

  // Sanitize the HTML description for safe rendering
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
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0 w-full">
        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden">
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
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {leftTab === "description" ? (
              <div className="space-y-4">
                {/* Rendered HTML Description */}
                <div
                  className="leetcode-description text-sm leading-relaxed text-primary/90"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />

                {/* Tags & Meta */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-black/10 dark:border-white/10">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${difficultyBg} ${difficultyColor}`}
                  >
                    {challenge.difficulty}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent/10 text-accent">
                    {challenge.points} XP
                  </span>
                  {challenge.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 dark:text-blue-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Editor */}
        <div className="lg:w-1/2 flex flex-col min-h-0 macos-glass rounded-xl overflow-hidden border border-white/5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <FiCode className="text-accent" />
              <span className="text-sm font-semibold">Code Editor</span>
            </div>
            <select
              className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-xs px-2 py-1 text-primary focus:outline-none"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          {/* CodeMirror Instance */}
          <div className="flex-1 min-h-0 overflow-hidden bg-black/10">
            <CodeMirror
              value={codeSnippet}
              height="100%"
              extensions={editorExtensions}
              onChange={(value) => setCodeSnippet(value)}
              className="text-sm h-full"
              basicSetup={{
                lineNumbers: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
              }}
            />
          </div>

          <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 shrink-0 space-y-3 bg-black/1">
            <div className="flex items-center justify-between text-[11px] text-secondary">
              <span>
                {codeStats.lines} lines • {codeStats.characters} chars
              </span>
              <div className="flex gap-2">
                <button onClick={handleInsertStarter}>
                  <FiRefreshCw />
                </button>
                <button onClick={handleCopyCode}>
                  <FiClipboard />
                </button>
                <button onClick={handleClearDraft}>
                  <FiTrash2 />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Submit Section */}
          <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 shrink-0 space-y-3">
            {/* GitHub URL Input */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex-1 focus-within:border-accent transition-colors">
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
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FiSend size={14} />{" "}
              {submitting ? "Transmitting..." : "Submit Solution"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDetails;
