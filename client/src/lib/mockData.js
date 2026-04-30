// ─────────────────────────────────────────────────────────────
// Mock Data for UI Testing
// Set USE_MOCK to false when your backend is ready.
// ─────────────────────────────────────────────────────────────

export const USE_MOCK = true;

// ─── Users ──────────────────────────────────────────────────

export const mockCurrentUser = {
  id: 'u_001',
  username: 'devmaster',
  role: 'admin', // change to 'user' to test non-admin views
};

export const mockUsers = [
  { _id: 'u_001', username: 'devmaster', email: 'devmaster@iter.ac.in', role: 'admin' },
  { _id: 'u_002', username: 'algoQueen', email: 'algoqueen@iter.ac.in', role: 'user' },
  { _id: 'u_003', username: 'binaryBoss', email: 'binaryboss@iter.ac.in', role: 'user' },
  { _id: 'u_004', username: 'codeNinja42', email: 'codeninja@iter.ac.in', role: 'user' },
  { _id: 'u_005', username: 'stackOverflow_fan', email: 'stackoverflow@iter.ac.in', role: 'user' },
  { _id: 'u_006', username: 'recursionKing', email: 'recursionking@iter.ac.in', role: 'user' },
  { _id: 'u_007', username: 'dpWizard', email: 'dpwizard@iter.ac.in', role: 'user' },
  { _id: 'u_008', username: 'graphGuru', email: 'graphguru@iter.ac.in', role: 'user' },
  { _id: 'u_009', username: 'bitManipulator', email: 'bitman@iter.ac.in', role: 'user' },
  { _id: 'u_010', username: 'heapHero', email: 'heaphero@iter.ac.in', role: 'user' },
];

// ─── Challenges / Missions ─────────────────────────────────

export const mockChallenges = [
  {
    _id: 'ch_001',
    title: 'Two Sum',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n\nConstraints:\n2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.',
    difficulty: 'Easy',
    points: 100,
    category: 'Arrays',
    link: 'https://leetcode.com/problems/two-sum/',
    createdAt: '2026-04-20T10:00:00.000Z',
  },
  {
    _id: 'ch_002',
    title: 'Longest Substring Without Repeating Characters',
    description:
      'Given a string s, find the length of the longest substring without repeating characters.\n\nExample 1:\nInput: s = "abcabcbb"\nOutput: 3\nExplanation: The answer is "abc", with the length of 3.\n\nConstraints:\n0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols, and spaces.',
    difficulty: 'Medium',
    points: 200,
    category: 'Strings',
    link: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    createdAt: '2026-04-21T14:30:00.000Z',
  },
  {
    _id: 'ch_003',
    title: 'Merge K Sorted Lists',
    description:
      'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.\n\nExample 1:\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]\n\nConstraints:\nk == lists.length\n0 <= k <= 10^4\n0 <= lists[i].length <= 500\n-10^4 <= lists[i][j] <= 10^4',
    difficulty: 'Hard',
    points: 350,
    category: 'Linked Lists',
    link: 'https://leetcode.com/problems/merge-k-sorted-lists/',
    createdAt: '2026-04-22T09:15:00.000Z',
  },
  {
    _id: 'ch_004',
    title: 'Valid Parentheses',
    description:
      'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\nExample:\nInput: s = "()[]{}"\nOutput: true',
    difficulty: 'Easy',
    points: 100,
    category: 'Stacks',
    link: 'https://leetcode.com/problems/valid-parentheses/',
    createdAt: '2026-04-23T11:00:00.000Z',
  },
  {
    _id: 'ch_005',
    title: 'Binary Tree Level Order Traversal',
    description:
      'Given the root of a binary tree, return the level order traversal of its nodes\' values (i.e., from left to right, level by level).\n\nExample:\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]',
    difficulty: 'Medium',
    points: 200,
    category: 'Trees',
    link: 'https://leetcode.com/problems/binary-tree-level-order-traversal/',
    createdAt: '2026-04-24T08:45:00.000Z',
  },
  {
    _id: 'ch_006',
    title: 'Trapping Rain Water',
    description:
      'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nExample:\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6',
    difficulty: 'Hard',
    points: 400,
    category: 'Arrays',
    link: 'https://leetcode.com/problems/trapping-rain-water/',
    createdAt: '2026-04-25T16:20:00.000Z',
  },
  {
    _id: 'ch_007',
    title: 'Climbing Stairs',
    description:
      'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\nExample:\nInput: n = 3\nOutput: 3',
    difficulty: 'Easy',
    points: 100,
    category: 'Dynamic Programming',
    link: 'https://leetcode.com/problems/climbing-stairs/',
    createdAt: '2026-04-26T07:00:00.000Z',
  },
  {
    _id: 'ch_008',
    title: 'Coin Change',
    description:
      'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins needed to make up that amount. If that amount cannot be made up, return -1.\n\nExample:\nInput: coins = [1,2,5], amount = 11\nOutput: 3\nExplanation: 11 = 5 + 5 + 1',
    difficulty: 'Medium',
    points: 250,
    category: 'Dynamic Programming',
    link: 'https://leetcode.com/problems/coin-change/',
    createdAt: '2026-04-26T12:00:00.000Z',
  },
  {
    _id: 'ch_009',
    title: 'Word Search II',
    description:
      'Given an m x n board of characters and a list of strings words, return all words on the board. Each word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.\n\nConstraints:\nm == board.length\nn == board[i].length\n1 <= m, n <= 12',
    difficulty: 'Hard',
    points: 400,
    category: 'Backtracking',
    link: 'https://leetcode.com/problems/word-search-ii/',
    createdAt: '2026-04-27T09:30:00.000Z',
  },
  {
    _id: 'ch_010',
    title: 'Maximum Subarray',
    description:
      'Given an integer array nums, find the subarray with the largest sum, and return its sum.\n\nExample:\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.',
    difficulty: 'Medium',
    points: 200,
    category: 'Arrays',
    link: 'https://leetcode.com/problems/maximum-subarray/',
    createdAt: '2026-04-28T10:00:00.000Z',
  },
];

// ─── Submissions ────────────────────────────────────────────

const NOW = Date.now();
const DAY = 86400000;

export const mockSubmissions = [
  {
    _id: 'sub_001',
    userId: mockUsers[0],
    challengeId: mockChallenges[0],
    language: 'javascript',
    code: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}',
    repositoryUrl: 'https://github.com/devmaster/two-sum',
    status: 'Accepted',
    submittedAt: new Date(NOW - 1 * DAY).toISOString(),
  },
  {
    _id: 'sub_002',
    userId: mockUsers[1],
    challengeId: mockChallenges[1],
    language: 'python',
    code: 'class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        seen = {}\n        start = max_len = 0\n        for i, ch in enumerate(s):\n            if ch in seen and seen[ch] >= start:\n                start = seen[ch] + 1\n            seen[ch] = i\n            max_len = max(max_len, i - start + 1)\n        return max_len',
    repositoryUrl: '',
    status: 'Accepted',
    submittedAt: new Date(NOW - 2 * DAY).toISOString(),
  },
  {
    _id: 'sub_003',
    userId: mockUsers[2],
    challengeId: mockChallenges[2],
    language: 'java',
    code: '// Brute force — TLE\npublic ListNode mergeKLists(ListNode[] lists) {\n  // incomplete implementation\n  return null;\n}',
    repositoryUrl: '',
    status: 'Rejected',
    submittedAt: new Date(NOW - 3 * DAY).toISOString(),
  },
  {
    _id: 'sub_004',
    userId: mockUsers[0],
    challengeId: mockChallenges[3],
    language: 'javascript',
    code: 'function isValid(s) {\n  const stack = [];\n  const map = { ")": "(", "]": "[", "}": "{" };\n  for (const ch of s) {\n    if ("([{".includes(ch)) stack.push(ch);\n    else if (stack.pop() !== map[ch]) return false;\n  }\n  return stack.length === 0;\n}',
    repositoryUrl: '',
    status: 'Accepted',
    submittedAt: new Date(NOW - 0.5 * DAY).toISOString(),
  },
  {
    _id: 'sub_005',
    userId: mockUsers[3],
    challengeId: mockChallenges[4],
    language: 'python',
    code: '# Pending review',
    repositoryUrl: 'https://github.com/codeninja42/bt-level-order',
    status: 'Pending',
    submittedAt: new Date(NOW - 4 * DAY).toISOString(),
  },
  {
    _id: 'sub_006',
    userId: mockUsers[4],
    challengeId: mockChallenges[5],
    language: 'cpp',
    code: '#include <vector>\nusing namespace std;\nint trap(vector<int>& h) {\n  int l = 0, r = h.size()-1, lm = 0, rm = 0, ans = 0;\n  while (l < r) {\n    if (h[l] < h[r]) { lm = max(lm, h[l]); ans += lm - h[l++]; }\n    else             { rm = max(rm, h[r]); ans += rm - h[r--]; }\n  }\n  return ans;\n}',
    repositoryUrl: '',
    status: 'Accepted',
    submittedAt: new Date(NOW - 5 * DAY).toISOString(),
  },
  {
    _id: 'sub_007',
    userId: mockUsers[5],
    challengeId: mockChallenges[6],
    language: 'javascript',
    code: 'function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) [a, b] = [b, a + b];\n  return b;\n}',
    repositoryUrl: '',
    status: 'Pending',
    submittedAt: new Date(NOW - 1.5 * DAY).toISOString(),
  },
  {
    _id: 'sub_008',
    userId: mockUsers[0],
    challengeId: mockChallenges[7],
    language: 'python',
    code: 'def coinChange(coins, amount):\n    dp = [float("inf")] * (amount + 1)\n    dp[0] = 0\n    for c in coins:\n        for x in range(c, amount + 1):\n            dp[x] = min(dp[x], dp[x - c] + 1)\n    return dp[amount] if dp[amount] != float("inf") else -1',
    repositoryUrl: '',
    status: 'Rejected',
    submittedAt: new Date(NOW - 6 * DAY).toISOString(),
  },
];

// ─── Clans ──────────────────────────────────────────────────

export const mockClans = [
  { _id: 'clan_001', name: 'Code Crusaders', tag: 'CC', memberCount: 12, solvedCount: 48, totalPoints: 4200, rank: 1 },
  { _id: 'clan_002', name: 'Binary Beasts', tag: 'BB', memberCount: 9, solvedCount: 35, totalPoints: 3100, rank: 2 },
  { _id: 'clan_003', name: 'Stack Smashers', tag: 'SS', memberCount: 15, solvedCount: 30, totalPoints: 2750, rank: 3 },
  { _id: 'clan_004', name: 'Heap Heroes', tag: 'HH', memberCount: 7, solvedCount: 22, totalPoints: 1900, rank: 4 },
  { _id: 'clan_005', name: 'Graph Gangsters', tag: 'GG', memberCount: 11, solvedCount: 18, totalPoints: 1500, rank: 5 },
];

// ─── Leaderboard Members ────────────────────────────────────

export const mockLeaderboardMembers = mockUsers.map((u, i) => ({
  _id: u._id,
  username: u.username,
  solvedCount: Math.max(1, 20 - i * 2),
  totalPoints: Math.max(100, 4500 - i * 450),
  rank: i + 1,
}));

// ─── Clan Members (for AdminPanel) ──────────────────────────

export const mockClanMembers = [
  { _id: 'cm_001', username: 'devmaster', email: 'devmaster@iter.ac.in', role: 'admin' },
  { _id: 'cm_002', username: 'algoQueen', email: 'algoqueen@iter.ac.in', role: 'moderator' },
  { _id: 'cm_003', username: 'binaryBoss', email: 'binaryboss@iter.ac.in', role: 'member' },
  { _id: 'cm_004', username: 'codeNinja42', email: 'codeninja@iter.ac.in', role: 'member' },
  { _id: 'cm_005', username: 'stackOverflow_fan', email: 'stackoverflow@iter.ac.in', role: 'member' },
];

// ─── Dashboard Summary ──────────────────────────────────────

export const mockDashboardSummary = {
  totalChallenges: mockChallenges.length,
  solved: 4,
  pending: 2,
  recentActivity: mockSubmissions
    .filter((s) => s.userId._id === mockCurrentUser.id || s.userId._id === 'u_001')
    .slice(0, 5),
};

// ─── Profile Stats ──────────────────────────────────────────

const mySubmissions = mockSubmissions.filter(
  (s) => s.userId._id === mockCurrentUser.id || s.userId._id === 'u_001',
);

export const mockProfileStats = {
  totalSubmissions: mySubmissions.length,
  acceptedCount: mySubmissions.filter((s) => s.status === 'Accepted').length,
  rejectedCount: mySubmissions.filter((s) => s.status === 'Rejected').length,
  pendingCount: mySubmissions.filter((s) => s.status === 'Pending').length,
  totalPoints: mySubmissions
    .filter((s) => s.status === 'Accepted')
    .reduce((sum, s) => sum + (s.challengeId?.points || 0), 0),
  recentSubmissions: mySubmissions,
};

// ─── Helper: paged response builder ────────────────────────

export const paginate = (items, { page = 1, limit = 6 } = {}) => {
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return {
    data,
    meta: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
};

// ─── Helper: filter & sort challenges ──────────────────────

export const filterChallenges = (params = {}) => {
  let filtered = [...mockChallenges];

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }
  if (params.difficulty) {
    filtered = filtered.filter((c) => c.difficulty === params.difficulty);
  }
  if (params.category) {
    const cat = params.category.toLowerCase();
    filtered = filtered.filter((c) => c.category.toLowerCase().includes(cat));
  }

  const sortBy = params.sortBy || 'createdAt';
  const dir = params.sortDir === 'asc' ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === 'difficulty') {
      const order = { Easy: 1, Medium: 2, Hard: 3 };
      return (order[a.difficulty] - order[b.difficulty]) * dir;
    }
    if (sortBy === 'title') return a.title.localeCompare(b.title) * dir;
    return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
  });

  return paginate(filtered, {
    page: Number(params.page) || 1,
    limit: Number(params.limit) || 6,
  });
};

// ─── Helper: filter submissions (admin review) ─────────────

export const filterSubmissions = (params = {}) => {
  let filtered = [...mockSubmissions];

  if (params.status) {
    filtered = filtered.filter((s) => s.status === params.status);
  }
  if (params.challengeId) {
    filtered = filtered.filter((s) => s.challengeId._id === params.challengeId);
  }

  return paginate(filtered, {
    page: Number(params.page) || 1,
    limit: Number(params.limit) || 10,
  });
};
