const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./src/features/users/User.model');
const Clan = require('./src/features/clans/Clan.model');
const Challenge = require('./src/features/challenges/Challenge.model');
const GlobalNotice = require('./src/features/notices/GlobalNotice.model');
const Badge = require('./src/features/badges/Badge.model');
const Resource = require('./src/features/resources/Resource.model');
const ChatMessage = require('./src/features/chat/ChatMessage.model');
const Submission = require('./src/features/submissions/Submission.model'); // Assumed path based on patterns

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
    title: "Merge k Sorted Lists",
    description: "You are given an array of `k` linked-lists lists, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.",
    difficulty: "Hard",
    points: 200,
    category: "Heaps"
  }
];

const badges = [
  { name: "First Blood", icon: "🩸", color: "red", rarity: "COMMON", description: "First successful submission in the arena." },
  { name: "Flawless Execution", icon: "✨", color: "gold", rarity: "EPIC", description: "Solved a hard problem on the first attempt." },
  { name: "Night Owl", icon: "🦉", color: "purple", rarity: "RARE", description: "Submitted a valid solution between 12 AM and 4 AM." },
  { name: "Algorithm Master", icon: "👑", color: "gold", rarity: "LEGENDARY", description: "Solved 100 consecutive problems." }
];

const resources = [
  { title: "Dynamic Programming Foundations", folder: "DP", type: "PDF", url: "https://example.com/dp-guide.pdf", sizeBytes: 1540000 },
  { title: "Graph Theory Masterclass", folder: "Graphs", type: "JSON", url: "https://example.com/graphs.json", sizeBytes: 52000 },
  { title: "Advanced Tree Traversal", folder: "Trees", type: "LINK", url: "https://example.com/trees-link", sizeBytes: 0 }
];

async function seedDatabase(isStandalone = false) {
  try {
    if (!isStandalone) {
      const dns = require('dns');
      dns.setServers(['8.8.8.8', '8.8.4.4']);
      console.log('🌱 Connecting to database...');
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connected to MongoDB Atlas');
    }

    console.log('🧹 Clearing old data...');
    await Promise.all([
      User.deleteMany({}),
      Clan.deleteMany({}),
      Challenge.deleteMany({}),
      GlobalNotice.deleteMany({}),
      Badge.deleteMany({}),
      Resource.deleteMany({}),
      ChatMessage.deleteMany({}),
      Submission.deleteMany({}) // Assumed Model exists
    ]).catch(e => console.log('Notice: Some collections might not exist yet, continuing...'));

    console.log('🌱 Seeding Challenges...');
    await Challenge.insertMany(challenges);

    console.log('🌱 Seeding Badges...');
    await Badge.insertMany(badges);

    console.log('🌱 Seeding Users & Clans...');

    const devmaster = await User.create({
      username: 'devmaster',
      email: 'devmaster@iter.ac.in',
      password: 'admin123',
      role: 'admin',
      isNewUser: false
    });

    const nishant = await User.create({
      username: 'nishant',
      email: 'nishhu24@gmail.com',
      password: 'nishhu24',
      role: 'admin',
      isNewUser: false
    });

    const clanChief = await User.create({
      username: 'chief1',
      email: 'chief1@iter.ac.in',
      password: 'admin123',
      role: 'clan-chief',
      isNewUser: false
    });

    const standardUser = await User.create({
      username: 'operative1',
      email: 'operative1@iter.ac.in',
      password: 'admin123',
      role: 'user',
      isNewUser: false
    });

    const clan = await Clan.create({
      name: 'Alpha Coders',
      tag: 'AC',
      description: 'The elite squad of algorithm masters.',
      chief: clanChief._id,
      members: [clanChief._id, standardUser._id]
    });

    await User.findByIdAndUpdate(clanChief._id, { clan: clan._id });
    await User.findByIdAndUpdate(standardUser._id, { clan: clan._id });

    console.log('🌱 Seeding Global Notices...');
    await GlobalNotice.create({
      title: "Operation Initialization",
      content: "Welcome to Algorithm Arena V2. All operatives please report to your designated clan chiefs.",
      type: "Standard",
      createdBy: devmaster._id
    });

    console.log('🌱 Seeding Resources...');
    const mappedResources = resources.map(r => ({ ...r, uploadedBy: devmaster._id }));
    await Resource.insertMany(mappedResources);

    console.log('✅ Seeding Complete! Database is fully populated.');
    if (!isStandalone) process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    if (!isStandalone) process.exit(1);
    throw err;
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };