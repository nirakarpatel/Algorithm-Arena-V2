import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FiTrash2, FiSearch, FiX } from "react-icons/fi";

import ConfirmDialog from "../../components/ConfirmDialog";
import SkeletonCard from "../../components/SkeletonCard";
import EmptyState from "../../components/EmptyState";
import CodeEditor from "../../components/CodeEditor";
import { LANGUAGE_MAP, LANGUAGE_OPTIONS } from "../../constants/languages";
import { api } from "../../lib/api";
import { isDrivableSignature } from "../../lib/leetcodeDriver";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Render a human-readable signature string so admins can verify fetched types. */
const SignatureInfo = ({ functionName, params, returnType }) => {
  const hasParams = Array.isArray(params) && params.length > 0;
  if (!functionName && !hasParams && !returnType) return null;

  const paramsStr = hasParams
    ? params.map((p) => `${p.name}: ${p.type}`).join(", ")
    : "(none)";
  const javaOk = isDrivableSignature("java", params, returnType);
  const cppOk = isDrivableSignature("cpp", params, returnType);

  return (
    <div className="text-[11px] font-mono bg-black/5 dark:bg-white/5 rounded px-2 py-1.5 mt-1 text-secondary">
      <div>
        {functionName || "?"}({paramsStr}) → {returnType || "?"}
      </div>
      <div className="mt-0.5">
        Java driver: <span className={javaOk ? "text-green-500" : "text-red-500"}>{javaOk ? "supported" : "not supported"}</span>
        {"  ·  "}
        C++ driver: <span className={cppOk ? "text-green-500" : "text-red-500"}>{cppOk ? "supported" : "not supported"}</span>
      </div>
    </div>
  );
};

const defaultChallengeForm = {
  title: "",
  description: "",
  link: "",
  difficulty: "Easy",
  points: 100,
  category: "Logic",
  tags: [],
  codeSnippets: [],
  solutions: [],
  functionName: "",
  params: [],
  returnType: "",
  testCases: [],
};

const prepareTestCases = (rawCases) =>
  rawCases
    .filter((tc) => tc.label.trim())
    .map((tc) => {
      let args = [];
      try { args = JSON.parse(tc.args); } catch { /* keep empty */ }
      return { label: tc.label, args, expected: tc.expected };
    });

const emptyTestCase = () => ({ label: "", args: "[]", expected: "" });

const prepareSolutions = (solutions = []) =>
  solutions
    .filter((solution) => solution.code?.trim())
    .map((solution) => ({
      lang:
        solution.lang ||
        LANGUAGE_OPTIONS.find((opt) => opt.key === solution.langSlug)?.label ||
        solution.langSlug,
      langSlug: solution.langSlug,
      code: solution.code,
    }));

const upsertSolution = (solutions = [], langSlug, code) => {
  const lang =
    LANGUAGE_OPTIONS.find((opt) => opt.key === langSlug)?.label || langSlug;
  const next = solutions.filter((solution) => solution.langSlug !== langSlug);
  if (code.trim()) next.push({ lang, langSlug, code });
  return next;
};

/** Decode HTML entities and strip outer quotes from expected values. */
const cleanExpected = (val) => {
  if (!val) return val;
  let s = val
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) s = s.slice(1, -1);
  return s;
};
// ── component ─────────────────────────────────────────────────────────────────

const ChallengesTab = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("create");

  // ── LeetCode auto-fill ───────────────────────────────────────────────────
  const [leetcodeInput, setLeetcodeInput] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [snippetPreviewLang, setSnippetPreviewLang] = useState("");
  const [solutionLangByKey, setSolutionLangByKey] = useState({});

  const handleAutoFill = async () => {
    if (!leetcodeInput) return toast.error("Please enter a slug or URL");

    const slug = leetcodeInput
      .replace("https://leetcode.com/problems/", "")
      .split("/")[0]
      .trim();

    setIsFetching(true);
    try {
      const res = await api.get(
        `/api/challenges/fetch-leetcode-details?slug=${slug}`,
      );
      const { title, content, difficulty, topicTags, codeSnippets, functionName, params, returnType, testCases } =
        res.data.data;

      const tags = (topicTags || []).map((t) => t.name);

      setCreateForm((prev) => ({
        ...prev,
        title,
        description: content,
        difficulty,
        category: tags[0] || prev.category,
        link: `https://leetcode.com/problems/${slug}/`,
        tags,
        codeSnippets: codeSnippets || [],
        functionName: functionName || prev.functionName,
        params: params || prev.params,
        returnType: returnType || prev.returnType,
        testCases: (testCases || []).map((tc) => ({
          ...tc,
          args: JSON.stringify(tc.args),
          expected: cleanExpected(tc.expected),
        })),
      }));

      if (codeSnippets?.length) {
        setSnippetPreviewLang(codeSnippets[0].langSlug);
      }

      toast.success("Details fetched successfully!");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to fetch LeetCode data",
      );
    } finally {
      setIsFetching(false);
    }
  };

  // ── form state ────────────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState(defaultChallengeForm);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [reviewFilters, setReviewFilters] = useState({
    page: 1,
    limit: 10,
    status: "Pending",
    userId: "",
    challengeId: "",
    range: "all",
    from: "",
    to: "",
  });

  const [challengeFilters, setChallengeFilters] = useState({
    search: "",
    range: "all",
    from: "",
    to: "",
  });

  // ── queries ───────────────────────────────────────────────────────────────
  const submissionsQuery = useQuery({
    queryKey: ["admin-submissions", reviewFilters],
    enabled: activeTab === "review",
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(reviewFilters.page));
      params.set("limit", String(reviewFilters.limit));
      if (reviewFilters.status) params.set("status", reviewFilters.status);
      if (reviewFilters.challengeId)
        params.set("challengeId", reviewFilters.challengeId);
      if (reviewFilters.userId.length === 24)
        params.set("userId", reviewFilters.userId);
      if (reviewFilters.range) params.set("range", reviewFilters.range);
      if (reviewFilters.from)
        params.set(
          "from",
          new Date(`${reviewFilters.from}T00:00:00.000Z`).toISOString(),
        );
      if (reviewFilters.to)
        params.set(
          "to",
          new Date(`${reviewFilters.to}T23:59:59.999Z`).toISOString(),
        );
      const res = await api.get(`/api/submissions?${params.toString()}`);
      return {
        data: res.data.data || [],
        meta: res.data.meta || {},
      };
    },
  });

  const challengesQuery = useQuery({
    queryKey: ["admin-challenges"],
    enabled: activeTab === "manage" || activeTab === "review",
    queryFn: async () => {
      try {
        const res = await api.get(
          "/api/challenges?page=1&limit=100&sortBy=createdAt&sortDir=desc",
        );
        const data = res.data.data || [];
        return data;
      } catch {
        return [];
      }
    },
  });

  const manageChallengesQuery = useQuery({
    queryKey: ["admin-manage-challenges", challengeFilters],
    enabled: activeTab === "manage",
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "100");
        params.set("sortBy", "createdAt");
        params.set("sortDir", "desc");
        if (challengeFilters.search)
          params.set("search", challengeFilters.search);
        if (challengeFilters.range) params.set("range", challengeFilters.range);
        if (challengeFilters.from) params.set("from", challengeFilters.from);
        if (challengeFilters.to) params.set("to", challengeFilters.to);
        const res = await api.get(`/api/challenges?${params.toString()}`);
        const data = res.data.data || [];
        return data;
      } catch {
        return [];
      }
    },
  });

  const onCreateChallenge = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/challenges", {
        ...createForm,
        solutions: prepareSolutions(createForm.solutions),
        testCases: prepareTestCases(createForm.testCases),
      });
      toast.success("Challenge created");
      setCreateForm(defaultChallengeForm);
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    } catch (err) {
      toast.error(err.userMessage || "Failed to create challenge");
    }
  };

  const onUpdateChallenge = async () => {
    if (!editingChallenge) return;
    try {
      await api.put(`/api/challenges/${editingChallenge._id}`, {
        title: editingChallenge.title,
        description: editingChallenge.description,
        link: editingChallenge.link || "",
        difficulty: editingChallenge.difficulty,
        points: Number(editingChallenge.points),
        category: editingChallenge.category,
        solutions: prepareSolutions(editingChallenge.solutions || []),
        functionName: editingChallenge.functionName || "",
        params: editingChallenge.params || [],
        returnType: editingChallenge.returnType || "",
        testCases: prepareTestCases(editingChallenge.testCases || []),
      });
      toast.success("Challenge updated");
      setEditingChallenge(null);
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    } catch (err) {
      toast.error(err.userMessage || "Failed to update challenge");
    }
  };

  const onDeleteChallenge = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/challenges/${deleteTarget._id}`);
      toast.success("Challenge deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    } catch (err) {
      toast.error(err.userMessage || "Failed to delete challenge");
    }
  };

  const onGrade = async (id, status) => {
    try {
      await api.put(`/api/submissions/${id}`, { status });
      toast.success(`Submission marked ${status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch (err) {
      toast.error(err.userMessage || "Failed to grade submission");
    }
  };

  const submissions = submissionsQuery.data?.data || [];
  const reviewMeta = submissionsQuery.data?.meta || {};

  const reviewQueryLabel = useMemo(() => {
    if (reviewFilters.status === "Pending") return "Pending Reviews";
    if (reviewFilters.status === "Accepted") return "Accepted";
    if (reviewFilters.status === "Rejected") return "Rejected";
    return "All";
  }, [reviewFilters.status]);

  const renderSolutionEditor = ({ editorKey, solutions = [], onChange }) => {
    const selectedLang =
      solutionLangByKey[editorKey] ||
      solutions.find((solution) => solution.code?.trim())?.langSlug ||
      "javascript";
    const selectedCode =
      solutions.find((solution) => solution.langSlug === selectedLang)?.code ||
      "";

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="field-label mb-0">Uploaded Solution</label>
          <select
            className="field-select text-xs w-44 py-1"
            value={selectedLang}
            onChange={(e) =>
              setSolutionLangByKey((prev) => ({
                ...prev,
                [editorKey]: e.target.value,
              }))
            }
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}{opt.version && ` (${opt.version})`}
              </option>
            ))}
          </select>
        </div>
        <div className="h-[260px] overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/20">
          <CodeEditor
            value={selectedCode}
            onChange={(value) =>
              onChange(upsertSolution(solutions, selectedLang, value || ""))
            }
            language={LANGUAGE_MAP[selectedLang]?.monacoLang ?? selectedLang}
            isDark={true}
            height="260px"
          />
        </div>
        <p className="text-[11px] text-secondary">
          Paste the optimal solution for the selected language. Blank languages
          are ignored when saved.
        </p>
      </div>
    );
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <h1 className="text-page-title font-extrabold">Challenges</h1>

      <div className="segmented flex flex-wrap justify-center gap-1">
        <button
          className={`segmented-btn ${activeTab === "create" ? "active" : ""}`}
          onClick={() => setActiveTab("create")}
        >
          New Challenge
        </button>
        <button
          className={`segmented-btn ${activeTab === "review" ? "active" : ""}`}
          onClick={() => setActiveTab("review")}
        >
          Review Work
        </button>
        <button
          className={`segmented-btn ${activeTab === "manage" ? "active" : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          Manage Challenges
        </button>
      </div>

      {activeTab === "create" && (
        <div className="macos-glass p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            {/* --- New LeetCode Fetcher Section --- */}
            <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 mb-8">
              <label className="field-label text-accent">
                Import from LeetCode
              </label>
              <div className="flex gap-2">
                <input
                  className="field-input border-accent/20"
                  placeholder="Paste LeetCode URL or slug (e.g. two-sum)"
                  value={leetcodeInput}
                  onChange={(e) => setLeetcodeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary whitespace-nowrap"
                  onClick={handleAutoFill}
                  disabled={isFetching}
                >
                  {isFetching ? "Fetching..." : "Auto-fill"}
                </button>
              </div>
              <p className="text-[10px] mt-2 text-secondary opacity-60">
                Enter the problem slug or full URL to automatically fetch title,
                difficulty, and description.
              </p>
            </div>

            <form onSubmit={onCreateChallenge} className="space-y-4">
              <h2 className="text-section-title font-bold">Create Challenge</h2>

              <div>
                <label className="field-label">Title</label>
                <input
                  name="createChallengeTitle"
                  className="field-input"
                  required
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="field-label">Description (HTML supported)</label>
                <textarea
                  name="createChallengeDescription"
                  className="field-textarea"
                  required
                  rows={8}
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="field-label">Original Question Link</label>
                <input
                  name="createChallengeLink"
                  className="field-input"
                  type="url"
                  placeholder="https://leetcode.com/problems/..."
                  value={createForm.link}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, link: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="field-label">Difficulty</label>
                  <select
                    name="createChallengeDifficulty"
                    className="field-select"
                    value={createForm.difficulty}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        difficulty: e.target.value,
                      }))
                    }
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Points</label>
                  <input
                    name="createChallengePoints"
                    className="field-input"
                    type="number"
                    required
                    value={createForm.points}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        points: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="field-label">Category</label>
                  <input
                    name="createChallengeCategory"
                    className="field-input"
                    required
                    value={createForm.category}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        category: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Tags Section */}
              {createForm.tags.length > 0 && (
                <div>
                  <label className="field-label">Topic Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {createForm.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent/10 text-accent border border-accent/20"
                      >
                        {tag}
                        <button
                          type="button"
                          className="ml-0.5 hover:text-red-400 transition-colors"
                          onClick={() =>
                            setCreateForm((p) => ({
                              ...p,
                              tags: p.tags.filter((t) => t !== tag),
                            }))
                          }
                        >
                          <FiX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Snippets Preview */}
              {createForm.codeSnippets.length > 0 && (
                <div>
                  <label className="field-label">
                    Starter Code Snippets ({createForm.codeSnippets.length}{" "}
                    languages)
                  </label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {createForm.codeSnippets.map((s) => (
                      <button
                        key={s.langSlug}
                        type="button"
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          snippetPreviewLang === s.langSlug
                            ? "bg-accent text-white"
                            : "bg-black/5 dark:bg-white/5 text-secondary hover:text-primary"
                        }`}
                        onClick={() => setSnippetPreviewLang(s.langSlug)}
                      >
                        {s.lang}
                      </button>
                    ))}
                  </div>
                  <pre className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-4 text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono">
                    <code>
                      {createForm.codeSnippets.find(
                        (s) => s.langSlug === snippetPreviewLang,
                      )?.code || "Select a language above"}
                    </code>
                  </pre>
                </div>
              )}

              {renderSolutionEditor({
                editorKey: "create-challenge",
                solutions: createForm.solutions || [],
                onChange: (solutions) =>
                  setCreateForm((prev) => ({ ...prev, solutions })),
              })}

              {/* Function Name */}
              <div>
                <label className="field-label">Solution Function Name</label>
                <input
                  name="createFunctionName"
                  className="field-input font-mono"
                  placeholder="e.g. twoSum"
                  value={createForm.functionName}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, functionName: e.target.value.trim() }))
                  }
                />
                <p className="text-[11px] text-secondary mt-1">
                  Used to auto-call the function when running JS / Python.
                </p>
                <SignatureInfo
                  functionName={createForm.functionName}
                  params={createForm.params}
                  returnType={createForm.returnType}
                />
              </div>

              {/* Test Cases Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="field-label mb-0">Test Cases</label>
                  <button
                    type="button"
                    className="text-xs text-accent hover:underline"
                    onClick={() =>
                      setCreateForm((p) => ({
                        ...p,
                        testCases: [...p.testCases, emptyTestCase()],
                      }))
                    }
                  >
                    + Add Case
                  </button>
                </div>
                {createForm.testCases.length === 0 ? (
                  <p className="text-[11px] text-secondary">No test cases yet — click Add Case.</p>
                ) : (
                  <div className="space-y-3">
                    {createForm.testCases.map((tc, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 items-start bg-black/5 dark:bg-white/5 rounded-xl p-3"
                      >
                        <div>
                          <p className="text-[10px] text-secondary mb-1">Label</p>
                          <input
                            className="field-input text-xs py-1"
                            placeholder="Example 1"
                            value={tc.label}
                            onChange={(e) =>
                              setCreateForm((p) => {
                                const t = [...p.testCases];
                                t[i] = { ...t[i], label: e.target.value };
                                return { ...p, testCases: t };
                              })
                            }
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-secondary mb-1">Args (JSON array)</p>
                          <input
                            className="field-input text-xs py-1 font-mono"
                            placeholder='[[2,7,11,15], 9]'
                            value={tc.args}
                            onChange={(e) =>
                              setCreateForm((p) => {
                                const t = [...p.testCases];
                                t[i] = { ...t[i], args: e.target.value };
                                return { ...p, testCases: t };
                              })
                            }
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-secondary mb-1">Expected</p>
                          <input
                            className="field-input text-xs py-1 font-mono"
                            placeholder='[0,1]'
                            value={tc.expected}
                            onChange={(e) =>
                              setCreateForm((p) => {
                                const t = [...p.testCases];
                                t[i] = { ...t[i], expected: e.target.value };
                                return { ...p, testCases: t };
                              })
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className="mt-5 text-secondary hover:text-red-400 transition-colors"
                          onClick={() =>
                            setCreateForm((p) => ({
                              ...p,
                              testCases: p.testCases.filter((_, j) => j !== i),
                            }))
                          }
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className="btn-primary">
                  Create Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "review" && (
        <div className="macos-glass p-6">
          <div className="space-y-4">
            <h2 className="text-section-title font-bold">{reviewQueryLabel}</h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <select
                name="reviewStatus"
                className="field-select"
                value={reviewFilters.status}
                onChange={(e) =>
                  setReviewFilters((p) => ({
                    ...p,
                    page: 1,
                    status: e.target.value,
                  }))
                }
              >
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                name="reviewChallenge"
                className="field-select"
                value={reviewFilters.challengeId}
                onChange={(e) =>
                  setReviewFilters((p) => ({
                    ...p,
                    page: 1,
                    challengeId: e.target.value,
                  }))
                }
              >
                <option value="">All Challenges</option>
                {(challengesQuery.data || []).map((challenge) => (
                  <option key={challenge._id} value={challenge._id}>
                    {challenge.title}
                  </option>
                ))}
              </select>
              <input
                name="reviewUserId"
                className="field-input"
                placeholder="User ID (24 chars)"
                value={reviewFilters.userId}
                onChange={(e) =>
                  setReviewFilters((p) => ({
                    ...p,
                    page: 1,
                    userId: e.target.value.trim(),
                  }))
                }
              />
              <select
                className="field-select"
                value={reviewFilters.range}
                onChange={(e) =>
                  setReviewFilters((p) => ({ ...p, range: e.target.value }))
                }
              >
                <option value="all">All Time</option>
                <option value="weekly">Last 7 Days</option>
                <option value="monthly">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
              {reviewFilters.range === "custom" && (
                <>
                  <input
                    name="reviewFromDate"
                    className="field-input"
                    type="date"
                    value={reviewFilters.from}
                    onChange={(e) =>
                      setReviewFilters((p) => ({
                        ...p,
                        page: 1,
                        from: e.target.value,
                      }))
                    }
                    aria-label="From date"
                  />
                  <input
                    name="reviewToDate"
                    className="field-input"
                    type="date"
                    value={reviewFilters.to}
                    onChange={(e) =>
                      setReviewFilters((p) => ({
                        ...p,
                        page: 1,
                        to: e.target.value,
                      }))
                    }
                    aria-label="To date"
                  />
                </>
              )}
              <select
                name="reviewPageSize"
                className="field-select"
                value={reviewFilters.limit}
                onChange={(e) =>
                  setReviewFilters((p) => ({
                    ...p,
                    page: 1,
                    limit: Number(e.target.value),
                  }))
                }
              >
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
              </select>
            </div>

            {submissionsQuery.isLoading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : submissions.length === 0 ? (
              <EmptyState
                title="No submissions"
                description="No submissions match your filters."
              />
            ) : (
              <>
                <div className="hidden md:block overflow-auto">
                  <table className="responsive-table">
                    <thead>
                      <tr className="text-left border-b border-glass-border text-secondary text-sm">
                        <th className="py-3">Student</th>
                        <th className="py-3">Challenge</th>
                        <th className="py-3">Language</th>
                        <th className="py-3">Status</th>
                        <th className="py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => (
                        <tr
                          key={sub._id}
                          className="border-b border-glass-border/60"
                        >
                          <td className="py-3">
                            {sub.userId?.username || "Unknown"}
                          </td>
                          <td className="py-3">
                            <Link
                              to={`/challenge/${sub.challengeId?._id}?review=${sub._id}`}
                              className="text-accent hover:underline font-medium"
                            >
                              {sub.challengeId?.title || "Unknown"}
                            </Link>
                          </td>
                          <td className="py-3">{sub.language || "-"}</td>
                          <td className="py-3">{sub.status}</td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button
                                className="btn-secondary"
                                onClick={() => onGrade(sub._id, "Accepted")}
                              >
                                Accept
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={() => onGrade(sub._id, "Rejected")}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {submissions.map((sub) => (
                    <div
                      key={sub._id}
                      className="border border-glass-border rounded-xl p-4 space-y-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {sub.userId?.username || "Unknown"}
                        </p>
                        <p className="text-secondary text-sm">
                          <Link
                            to={`/challenge/${sub.challengeId?._id}?review=${sub._id}`}
                            className="text-accent hover:underline"
                          >
                            {sub.challengeId?.title || "Unknown challenge"}
                          </Link>
                        </p>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{sub.language || "-"}</span>
                        <span>{sub.status}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => onGrade(sub._id, "Accepted")}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => onGrade(sub._id, "Rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-secondary text-sm">
                    Page {reviewMeta.page || 1} of {reviewMeta.totalPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setReviewFilters((p) => ({
                          ...p,
                          page: Math.max(1, p.page - 1),
                        }))
                      }
                      disabled={(reviewMeta.page || 1) <= 1}
                    >
                      Prev
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setReviewFilters((p) => ({ ...p, page: p.page + 1 }))
                      }
                      disabled={
                        (reviewMeta.page || 1) >= (reviewMeta.totalPages || 1)
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "manage" && (
        <div className="macos-glass p-6">
          <h2 className="text-section-title font-bold mb-4">
            Manage Challenges
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                className="field-input pl-10"
                placeholder="Search challenges..."
                value={challengeFilters.search}
                onChange={(e) =>
                  setChallengeFilters((p) => ({ ...p, search: e.target.value }))
                }
              />
            </div>
            <select
              className="field-select"
              value={challengeFilters.range}
              onChange={(e) =>
                setChallengeFilters((p) => ({ ...p, range: e.target.value }))
              }
            >
              <option value="all">All Time</option>
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            {challengeFilters.range === "custom" && (
              <>
                <input
                  type="date"
                  className="field-input"
                  value={challengeFilters.from}
                  onChange={(e) =>
                    setChallengeFilters((p) => ({ ...p, from: e.target.value }))
                  }
                  aria-label="From Date"
                />
                <input
                  type="date"
                  className="field-input"
                  value={challengeFilters.to}
                  onChange={(e) =>
                    setChallengeFilters((p) => ({ ...p, to: e.target.value }))
                  }
                  aria-label="To Date"
                />
              </>
            )}
          </div>

          {manageChallengesQuery.isLoading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (manageChallengesQuery.data || []).length === 0 ? (
            <EmptyState
              title="No challenges match"
              description="Adjust your filters or create a new challenge."
            />
          ) : (
            <div className="space-y-3">
              {(manageChallengesQuery.data || []).map((challenge) => (
                <div
                  key={challenge._id}
                  className="border border-glass-border rounded-xl p-4 flex flex-wrap gap-3 justify-between items-start"
                >
                  <div>
                    <h3 className="font-semibold">{challenge.title}</h3>
                    <p className="text-secondary text-sm">
                      {challenge.difficulty} - {challenge.points} XP -{" "}
                      {challenge.category}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setEditingChallenge({
                          ...challenge,
                          solutions: challenge.solutions || [],
                          testCases: (challenge.testCases || []).map((tc) => ({
                            ...tc,
                            args: JSON.stringify(tc.args ?? []),
                            expected: cleanExpected(tc.expected),
                          })),
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setDeleteTarget(challenge)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Edit Challenge Modal ─────────────────────────────────────── */}
      {editingChallenge && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="macos-glass w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-section-title font-bold">Edit Challenge</h3>
            <div>
              <label className="field-label">Title</label>
              <input
                name="editChallengeTitle"
                className="field-input"
                value={editingChallenge.title}
                onChange={(e) =>
                  setEditingChallenge((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea
                name="editChallengeDescription"
                className="field-textarea"
                value={editingChallenge.description}
                onChange={(e) =>
                  setEditingChallenge((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="field-label">Original Question Link</label>
              <input
                name="editChallengeLink"
                className="field-input"
                type="url"
                placeholder="https://leetcode.com/problems/..."
                value={editingChallenge.link || ""}
                onChange={(e) =>
                  setEditingChallenge((p) => ({ ...p, link: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                name="editChallengeDifficulty"
                className="field-select"
                value={editingChallenge.difficulty}
                onChange={(e) =>
                  setEditingChallenge((p) => ({
                    ...p,
                    difficulty: e.target.value,
                  }))
                }
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              <input
                name="editChallengePoints"
                className="field-input"
                type="number"
                value={editingChallenge.points}
                onChange={(e) =>
                  setEditingChallenge((p) => ({
                    ...p,
                    points: Number(e.target.value),
                  }))
                }
              />
              <input
                name="editChallengeCategory"
                className="field-input"
                value={editingChallenge.category}
                onChange={(e) =>
                  setEditingChallenge((p) => ({
                    ...p,
                    category: e.target.value,
                  }))
                }
              />
            </div>

            {renderSolutionEditor({
              editorKey: "edit-challenge",
              solutions: editingChallenge.solutions || [],
              onChange: (solutions) =>
                setEditingChallenge((prev) => ({ ...prev, solutions })),
            })}

            {/* Function Name */}
            <div>
              <label className="field-label">Solution Function Name</label>
              <input
                name="editFunctionName"
                className="field-input font-mono"
                placeholder="e.g. twoSum"
                value={editingChallenge.functionName || ""}
                onChange={(e) =>
                  setEditingChallenge((p) => ({ ...p, functionName: e.target.value.trim() }))
                }
              />
              <SignatureInfo
                functionName={editingChallenge.functionName}
                params={editingChallenge.params}
                returnType={editingChallenge.returnType}
              />
            </div>

            {/* Test Cases Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="field-label mb-0">Test Cases</label>
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                  onClick={() =>
                    setEditingChallenge((p) => ({
                      ...p,
                      testCases: [...(p.testCases || []), emptyTestCase()],
                    }))
                  }
                >
                  + Add Case
                </button>
              </div>
              {(editingChallenge.testCases || []).length === 0 ? (
                <p className="text-[11px] text-secondary">No test cases — click Add Case.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {(editingChallenge.testCases || []).map((tc, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 items-start bg-black/5 dark:bg-white/5 rounded-xl p-3"
                    >
                      <div>
                        <p className="text-[10px] text-secondary mb-1">Label</p>
                        <input
                          className="field-input text-xs py-1"
                          placeholder="Example 1"
                          value={tc.label}
                          onChange={(e) =>
                            setEditingChallenge((p) => {
                              const t = [...(p.testCases || [])];
                              t[i] = { ...t[i], label: e.target.value };
                              return { ...p, testCases: t };
                            })
                          }
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary mb-1">Args (JSON array)</p>
                        <input
                          className="field-input text-xs py-1 font-mono"
                          placeholder='[[2,7,11,15], 9]'
                          value={tc.args}
                          onChange={(e) =>
                            setEditingChallenge((p) => {
                              const t = [...(p.testCases || [])];
                              t[i] = { ...t[i], args: e.target.value };
                              return { ...p, testCases: t };
                            })
                          }
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary mb-1">Expected</p>
                        <input
                          className="field-input text-xs py-1 font-mono"
                          placeholder='[0,1]'
                          value={tc.expected}
                          onChange={(e) =>
                            setEditingChallenge((p) => {
                              const t = [...(p.testCases || [])];
                              t[i] = { ...t[i], expected: e.target.value };
                              return { ...p, testCases: t };
                            })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-5 text-secondary hover:text-red-400 transition-colors"
                        onClick={() =>
                          setEditingChallenge((p) => ({
                            ...p,
                            testCases: (p.testCases || []).filter((_, j) => j !== i),
                          }))
                        }
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setEditingChallenge(null)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={onUpdateChallenge}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title="Delete Challenge"
          description={`Are you sure you want to delete "${deleteTarget.title}"?`}
          onConfirm={onDeleteChallenge}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default ChallengesTab;
