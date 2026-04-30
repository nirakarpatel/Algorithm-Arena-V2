const mongoose = require('mongoose');
const Challenge = require('./models/Challenge');

const challenges = [
  {
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n**Example:**\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]",
    difficulty: "Easy",
    points: 50,
    category: "Arrays"
  },
  {
    title: "Reverse Linked List",
    description: "Given the `head` of a singly linked list, reverse the list, and return the reversed list.\n\n**Example:**\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]",
    difficulty: "Easy",
    points: 50,
    category: "Linked Lists"
  },
  {
    title: "Longest Substring Without Repeating Characters",
    description: "Given a string `s`, find the length of the longest substring without repeating characters.\n\n**Example:**\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with the length of 3.",
    difficulty: "Medium",
    points: 100,
    category: "Strings"
  },
  {
    title: "Valid Parentheses",
    description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.",
    difficulty: "Easy",
    points: 50,
    category: "Stacks"
  },
  {
    title: "Merge k Sorted Lists",
    description: "You are given an array of `k` linked-lists lists, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.",
    difficulty: "Hard",
    points: 200,
    category: "Heaps"
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');
    
    // Clear existing challenges
    await Challenge.deleteMany({});
    console.log('🧹 Cleared old challenges...');

    // Insert new ones
    await Challenge.insertMany(challenges);
    console.log('✅ Database Seeded with 5 Pro Challenges!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  }
}

if (require.main === module) {
  require('dotenv').config();
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);

  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      console.log('🌱 Connected to MongoDB (via Google DNS)...');
      await seedDatabase();
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };