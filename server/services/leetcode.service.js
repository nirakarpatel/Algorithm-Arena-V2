const axios = require("axios");

// LeetCode lang slugs → our internal lang slugs
const LANG_SLUG_MAP = {
  javascript: "javascript",
  python3:    "python",
  java:       "java",
  cpp:        "cpp",
};

/**
 * Parse a single exampleTestcaseList entry (stdin-format string where each
 * arg is on its own line) into a JS array of native values.
 */
const parseTestCaseArgs = (stdinStr, params) => {
  const lines = stdinStr.trim().split("\n");
  return params.map((_, i) => {
    const raw = (lines[i] ?? "").trim();
    try { return JSON.parse(raw); } catch { return raw; }
  });
};

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

const cleanExpectedOutput = (val) => {
  return decodeHtmlEntities(val).trim();
};

/**
 * Extract expected output strings from LeetCode's HTML description.
 */ 
const extractExpectedOutputs = (html) => {
  const results = [];
  const rx = /<strong[^>]*>Output:<\/strong>:?\s*([^\n<]+)/gi;
  let m;
  while ((m = rx.exec(html)) !== null) {
    const val = m[1].trim();
    if (val) results.push(cleanExpectedOutput(val));
  }
  return results;
};

exports.fetchLeetCodeDetails = async (slug) => {
  const URL = "https://leetcode.com/graphql";

  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        content
        difficulty
        topicTags { name }
        metaData
        exampleTestcaseList
        codeSnippets {
          lang
          langSlug
          code
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      URL,
      { query, variables: { titleSlug: slug } },
      {
        headers: {
          "Content-Type": "application/json",
          Referer: `https://leetcode.com/problems/${slug}/`,
          Origin: "https://leetcode.com",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "x-csrftoken": "no-token",
        },
        timeout: 10000,
      },
    );

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const question = response.data.data.question;

    // Filter + remap code snippets to our lang slugs
    question.codeSnippets = (question.codeSnippets || [])
      .filter((s) => LANG_SLUG_MAP[s.langSlug])
      .map((s) => ({ ...s, langSlug: LANG_SLUG_MAP[s.langSlug] }));

    // Add language preambles that LeetCode pre-includes but Judge0 does not
    question.codeSnippets = question.codeSnippets.map((s) => {
      if (s.langSlug === "python" && !s.code.includes("from typing import"))
        return { ...s, code: "from typing import List, Optional\n\n" + s.code };
      if (s.langSlug === "java" && !s.code.includes("import"))
        return { ...s, code: "import java.util.*;\nimport java.util.stream.*;\n\n" + s.code };
      if (s.langSlug === "cpp" && !s.code.includes("#include"))
        return { ...s, code: "#include <bits/stdc++.h>\nusing namespace std;\n\n" + s.code };
      if (s.langSlug === "c" && !s.code.includes("#include"))
        return { ...s, code: "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <limits.h>\n\n" + s.code };
      return s;
    });

    // Parse metaData for function name + param info
    let functionName = "";
    let params = [];
    let returnType = "";
    try {
      const meta = JSON.parse(question.metaData || "{}");
      functionName = meta.name || "";
      params = meta.params || [];
      returnType = meta.return?.type || "";
    } catch { /* leave empty */ }

    // Build testCases from exampleTestcaseList + HTML expected outputs
    const expectedOutputs = extractExpectedOutputs(question.content || "");
    const testCases = (question.exampleTestcaseList || []).map((stdin, i) => ({
      label: `Case ${i + 1}`,
      args: parseTestCaseArgs(stdin, params),
      expected: expectedOutputs[i] || "",
    }));

    return {
      title: question.title,
      content: question.content,
      difficulty: question.difficulty,
      topicTags: question.topicTags,
      codeSnippets: question.codeSnippets,
      functionName,
      params,
      returnType,
      testCases,
    };
  } catch (error) {
    if (error.response) {
      console.error('LeetCode Response Data:', error.response.data);
      console.error('LeetCode Response Status:', error.response.status);
    }
    throw error;
  }
};
