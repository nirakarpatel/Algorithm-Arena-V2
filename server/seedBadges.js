require('dotenv').config();
const mongoose = require('mongoose');

const BADGES = [
  // 1. Milestone Badges
  { name: 'First Blood', icon: '🩸', rarity: 'COMMON', description: '1 problem solved' },
  { name: 'Algorithm Master', icon: '👑', rarity: 'LEGENDARY', description: '100 problems solved' },
  { name: 'Code Novice', icon: '🌱', rarity: 'COMMON', description: '10 problems solved' },
  { name: 'Code Adept', icon: '🌿', rarity: 'RARE', description: '50 problems solved' },
  { name: 'Code Sensei', icon: '🐉', rarity: 'EPIC', description: '150 problems solved' },
  { name: 'Ascended', icon: '🌌', rarity: 'LEGENDARY', description: '250 problems solved' },

  // 2. Difficulty Mastery
  { name: 'Easy Peasy', icon: '🟢', rarity: 'COMMON', description: '10 Easy problems solved' },
  { name: 'Warmup Complete', icon: '🏃', rarity: 'RARE', description: '25 Easy problems solved' },
  { name: 'Stepping Up', icon: '🟡', rarity: 'RARE', description: '10 Medium problems solved' },
  { name: 'Midweight Champ', icon: '🥊', rarity: 'EPIC', description: '25 Medium problems solved' },
  { name: 'Grandmaster', icon: '🔮', rarity: 'LEGENDARY', description: '1 Hard problem solved' },
  { name: 'Abyss Walker', icon: '🌑', rarity: 'LEGENDARY', description: '10 Hard problems solved' },

  // 3. Streak & Consistency
  { name: 'Streak Warrior', icon: '🔥', rarity: 'EPIC', description: '5-day streak' },
  { name: 'Habit Builder', icon: '📅', rarity: 'COMMON', description: '3-day streak' },
  { name: 'Unstoppable', icon: '☄️', rarity: 'EPIC', description: '14-day streak' },
  { name: 'Lunar Cycle', icon: '🌕', rarity: 'LEGENDARY', description: '30-day streak' },
  { name: 'Weekend Warrior', icon: '🏖️', rarity: 'RARE', description: 'Solve 5 problems on weekends' },
  { name: 'Night Owl', icon: '🦉', rarity: 'RARE', description: 'Solve between 12am-4am' },
  { name: 'Early Bird', icon: '🌅', rarity: 'RARE', description: 'Solve between 5am-8am' },

  // 4. Precision & Accuracy
  { name: 'Flawless', icon: '✨', rarity: 'EPIC', description: 'First-attempt perfect solve' },
  { name: 'Sharpshooter', icon: '🎯', rarity: 'EPIC', description: '10 first-attempt perfect solves' },
  { name: 'Eagle Eye', icon: '🦅', rarity: 'LEGENDARY', description: '50 first-attempt perfect solves' },
  { name: 'Resilient', icon: '🛡️', rarity: 'RARE', description: 'Accepted after 5+ Rejected attempts on the same problem' },
  { name: 'Never Surrender', icon: '⚔️', rarity: 'EPIC', description: 'Accepted after 10+ Rejected attempts on the same problem' },
  { name: 'Trial & Error', icon: '🧪', rarity: 'COMMON', description: 'First time getting a Rejected submission' },

  // 5. Language Diversity
  { name: 'Polyglot', icon: '🗣️', rarity: 'EPIC', description: 'Solve at least 1 problem in 3 different languages' },
  { name: 'JS Ninja', icon: '🟨', rarity: 'RARE', description: '10 problems solved in JavaScript' },
  { name: 'Pythonista', icon: '🐍', rarity: 'RARE', description: '10 problems solved in Python' },
  { name: 'Java Juggernaut', icon: '☕', rarity: 'RARE', description: '10 problems solved in Java' },
  { name: 'C/C++ Hacker', icon: '⚙️', rarity: 'RARE', description: '10 problems solved in C or C++' },

  // 6. Miscellaneous
  { name: 'Reviewee', icon: '📝', rarity: 'COMMON', description: 'Receive your first feedback from a Clan Chief' },
  { name: 'Perfectionist', icon: '💎', rarity: 'LEGENDARY', description: '100% acceptance rate with at least 10 problems solved' },
  { name: 'Speedster', icon: '⚡', rarity: 'RARE', description: 'Two accepted submissions within 10 minutes' },
  { name: 'Marathon', icon: '🏃‍♂️', rarity: 'EPIC', description: '5 accepted submissions in a single day' }
];

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Badge = require('./src/features/badges/Badge.model');
  
  console.log('Clearing old badges...');
  await Badge.deleteMany({});
  
  console.log('Inserting new badges...');
  await Badge.insertMany(BADGES);
  
  console.log(`Successfully seeded ${BADGES.length} badges!`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
