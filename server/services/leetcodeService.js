const axios = require("axios");

exports.fetchLeetCodeChallenges = async (slug) => {
  const URL = "https://leetcode.com/graphql";

  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        content
        difficulty
        topicTags { name }
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
      {
        query,
        variables: { titleSlug: slug },
      },
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
      console.error("GQL Logic Errors:", response.data.errors);
      throw new Error(response.data.errors[0].message);
    }
    const SUPPORTED_LANG_SLUGS = ['javascript', 'python3', 'java', 'cpp'];

    const question = response.data.data.question;
    if (question && question.codeSnippets) {
      question.codeSnippets = question.codeSnippets.filter(
        (s) => SUPPORTED_LANG_SLUGS.includes(s.langSlug)
      );
    }

    return question;
  } catch (error) {
    if (error.response) {
      console.error("LeetCode Response Data:", error.response.data);
      console.error("LeetCode Response Status:", error.response.status);
    }
    throw error;
  }
};
