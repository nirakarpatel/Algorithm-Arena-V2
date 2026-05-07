const axios = require('axios');
const { sendSuccess } = require('../utils/response');

const scrapeLeetCode = async (req, res, next) => {
  try {
    const { slug } = req.query;
    if (!slug) {
      res.status(400);
      throw new Error('Please provide a slug query parameter');
    }

    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title
          content
          difficulty
          codeSnippets {
            lang
            langSlug
            code
          }
        }
      }
    `;

    const response = await axios.post(
      'https://leetcode.com/graphql',
      {
        query,
        variables: { titleSlug: slug }
      },
      {
        headers: {
          'Referer': `https://leetcode.com/problems/${slug}/`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Content-Type': 'application/json'
        }
      }
    );

    const question = response.data?.data?.question;
    
    if (!question) {
      res.status(404);
      throw new Error('Challenge not found on LeetCode');
    }

    return sendSuccess(res, {
      data: question,
      message: 'Scraped successfully'
    });
  } catch (err) {
    if (err.response && err.response.status === 403) {
      res.status(403);
      return next(new Error('LeetCode blocked the request (403 Forbidden)'));
    }
    return next(err);
  }
};

module.exports = {
  scrapeLeetCode
};
