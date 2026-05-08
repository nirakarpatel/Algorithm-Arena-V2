const leetcodeService = require('./server/services/leetcodeService');

async function test() {
  try {
    const data = await leetcodeService.fetchLeetCodeChallenges('two-sum');
    console.log(data ? "Success: " + data.title : "No data");
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
