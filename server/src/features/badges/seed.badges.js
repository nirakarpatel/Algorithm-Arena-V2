/**
 * Badge Seeder — Run once to populate the DB with all badges.
 * Usage: node server/src/features/badges/seed.badges.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const mongoose = require('mongoose');
const Badge = require('./Badge.model');

const BADGES = [
  // ── Milestones ──────────────────────────────────────────────
  { name: 'First Blood',      icon: '🩸', rarity: 'COMMON',    color: 'red',    earnDifficulty: 'Easy',   description: 'Solved your very first challenge.' },
  { name: 'Code Rookie',      icon: '🌱', rarity: 'COMMON',    color: 'green',  earnDifficulty: 'Easy',   description: '5 unique challenges solved.' },
  { name: 'Code Novice',      icon: '📗', rarity: 'COMMON',    color: 'green',  earnDifficulty: 'Easy',   description: '10 unique challenges solved.' },
  { name: 'Challenger',       icon: '⚔️', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Medium', description: '25 unique challenges solved.' },
  { name: 'Code Adept',       icon: '🧠', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Medium', description: '50 unique challenges solved.' },
  { name: 'Algorithm Master', icon: '🔮', rarity: 'EPIC',      color: 'purple', earnDifficulty: 'Hard',   description: '100 unique challenges conquered.' },
  { name: 'Code Sensei',      icon: '🥷', rarity: 'EPIC',      color: 'purple', earnDifficulty: 'Hard',   description: '150 unique challenges conquered.' },
  { name: 'Ascended',         icon: '🌌', rarity: 'LEGENDARY', color: 'gold',   earnDifficulty: 'Elite',  description: '250 challenges — you are legendary.' },
  { name: 'The Legend',       icon: '👑', rarity: 'LEGENDARY', color: 'gold',   earnDifficulty: 'Elite',  description: '500 challenges — true mastery achieved.' },

  // ── Difficulty Mastery ───────────────────────────────────────
  { name: 'Easy Peasy',       icon: '🍃', rarity: 'COMMON',    color: 'green',  earnDifficulty: 'Easy',   description: '10 Easy problems solved.' },
  { name: 'Warmup Complete',  icon: '🏃', rarity: 'COMMON',    color: 'green',  earnDifficulty: 'Medium', description: '25 Easy problems solved.' },
  { name: 'Stepping Up',      icon: '📈', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Medium', description: '10 Medium problems conquered.' },
  { name: 'Midweight Champ',  icon: '🥊', rarity: 'RARE',      color: 'orange', earnDifficulty: 'Hard',   description: '25 Medium problems conquered.' },
  { name: 'Grandmaster',      icon: '🏔️', rarity: 'EPIC',      color: 'red',    earnDifficulty: 'Hard',   description: 'First Hard problem solved.' },
  { name: 'Abyss Walker',     icon: '🌑', rarity: 'EPIC',      color: 'purple', earnDifficulty: 'Elite',  description: '10 Hard problems — into the abyss.' },
  { name: 'Elite Solver',     icon: '💎', rarity: 'LEGENDARY', color: 'gold',   earnDifficulty: 'Elite',  description: '25 Hard problems — true elite.' },

  // ── Streaks & Consistency ────────────────────────────────────
  { name: 'Solo Sprint',      icon: '⚡', rarity: 'COMMON',    color: 'green',  earnDifficulty: 'Easy',   description: 'First daily solving streak.' },
  { name: 'Habit Builder',    icon: '📅', rarity: 'COMMON',    color: 'blue',   earnDifficulty: 'Easy',   description: '3-day solving streak maintained.' },
  { name: 'Streak Warrior',   icon: '🔥', rarity: 'RARE',      color: 'orange', earnDifficulty: 'Medium', description: '5-day streak — fire is spreading.' },
  { name: 'Consistent Coder', icon: '🗓️', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Medium', description: '7-day streak — a full week of coding.' },
  { name: 'Unstoppable',      icon: '🌊', rarity: 'EPIC',      color: 'purple', earnDifficulty: 'Hard',   description: '14-day streak — nothing can stop you.' },
  { name: 'Lunar Cycle',      icon: '🌕', rarity: 'LEGENDARY', color: 'gold',   earnDifficulty: 'Elite',  description: '30-day streak — one full lunar cycle.' },
  { name: 'Night Owl',        icon: '🦉', rarity: 'RARE',      color: 'purple', earnDifficulty: 'Easy',   description: 'Solved between 12am – 4am.' },
  { name: 'Dawn Coder',       icon: '🌄', rarity: 'RARE',      color: 'orange', earnDifficulty: 'Medium', description: 'Solved between 4am – 5am.' },
  { name: 'Early Bird',       icon: '🐦', rarity: 'COMMON',    color: 'green',  earnDifficulty: 'Easy',   description: 'Solved between 5am – 8am.' },
  { name: 'Weekend Warrior',  icon: '🎮', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Medium', description: '5 problems solved on weekends.' },

  // ── Precision & Accuracy ────────────────────────────────────
  { name: 'Trial & Error',    icon: '🔁', rarity: 'COMMON',    color: 'green',  earnDifficulty: 'Easy',   description: 'Your first rejected submission — learn from it.' },
  { name: 'Flawless',         icon: '✨', rarity: 'COMMON',    color: 'blue',   earnDifficulty: 'Easy',   description: 'First-try acceptance on a problem.' },
  { name: 'Comeback King',    icon: '🔄', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Medium', description: 'Accepted after 3+ rejections on the same problem.' },
  { name: 'Resilient',        icon: '🛡️', rarity: 'RARE',      color: 'orange', earnDifficulty: 'Medium', description: 'Accepted after 5+ rejections on the same problem.' },
  { name: 'Sharpshooter',     icon: '🎯', rarity: 'EPIC',      color: 'purple', earnDifficulty: 'Hard',   description: '10 first-try accepted solutions.' },
  { name: 'Never Surrender',  icon: '💪', rarity: 'EPIC',      color: 'red',    earnDifficulty: 'Hard',   description: 'Accepted after 10+ rejections.' },
  { name: 'Eagle Eye',        icon: '🦅', rarity: 'LEGENDARY', color: 'gold',   earnDifficulty: 'Elite',  description: '50 first-try accepted solutions.' },

  // ── Language Diversity ───────────────────────────────────────
  { name: 'Polyglot',         icon: '🌐', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Medium', description: 'Solved in 3 different languages.' },
  { name: 'JS Ninja',         icon: '🟨', rarity: 'RARE',      color: 'gold',   earnDifficulty: 'Medium', description: '10 problems solved in JavaScript.' },
  { name: 'Pythonista',       icon: '🐍', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Medium', description: '10 problems solved in Python.' },
  { name: 'Java Juggernaut',  icon: '☕', rarity: 'RARE',      color: 'red',    earnDifficulty: 'Medium', description: '10 problems solved in Java.' },
  { name: 'C/C++ Hacker',     icon: '⚙️', rarity: 'RARE',      color: 'cyan',   earnDifficulty: 'Medium', description: '10 problems solved in C or C++.' },
  { name: 'Polyglot Pro',     icon: '🗺️', rarity: 'EPIC',      color: 'purple', earnDifficulty: 'Hard',   description: 'Solved in 5 different languages.' },

  // ── Special ──────────────────────────────────────────────────
  { name: 'Reviewee',         icon: '📝', rarity: 'COMMON',    color: 'blue',   earnDifficulty: 'Easy',   description: 'Received feedback on a submission.' },
  { name: 'Speedster',        icon: '🚀', rarity: 'EPIC',      color: 'orange', earnDifficulty: 'Hard',   description: '2 different problems solved within 10 minutes.' },
  { name: 'Marathon',         icon: '🏅', rarity: 'EPIC',      color: 'purple', earnDifficulty: 'Hard',   description: '5 problems solved in a single day.' },
  { name: 'Swift Fingers',    icon: '⌨️', rarity: 'EPIC',      color: 'cyan',   earnDifficulty: 'Hard',   description: '10 problems solved in a single day.' },
  { name: 'Perfectionist',    icon: '💯', rarity: 'LEGENDARY', color: 'gold',   earnDifficulty: 'Elite',  description: '100% acceptance rate with 10+ accepted.' },

  // ── Chief's Choice (manually awarded) ────────────────────────
  { name: 'MVP',              icon: '⭐', rarity: 'LEGENDARY', color: 'gold',   earnDifficulty: 'Easy', isChiefBadge: true, description: 'Most Valuable Player — awarded by Clan Chief.' },
  { name: 'Star Performer',   icon: '🌟', rarity: 'EPIC',      color: 'purple', earnDifficulty: 'Easy', isChiefBadge: true, description: 'Outstanding performance recognized by the Clan Chief.' },
  { name: 'Rising Star',      icon: '🚀', rarity: 'RARE',      color: 'blue',   earnDifficulty: 'Easy', isChiefBadge: true, description: 'Rapid growth and improvement — awarded by Clan Chief.' },
  { name: 'Team Player',      icon: '🤝', rarity: 'RARE',      color: 'green',  earnDifficulty: 'Easy', isChiefBadge: true, description: 'Excellent collaboration and support within the clan.' },
  { name: 'Honor Roll',       icon: '🏆', rarity: 'EPIC',      color: 'gold',   earnDifficulty: 'Easy', isChiefBadge: true, description: 'Consistent excellence recognized by Clan Chief.' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);
  console.log('Connected to DB');

  let created = 0, updated = 0;
  for (const badge of BADGES) {
    const result = await Badge.findOneAndUpdate(
      { name: badge.name },
      { $set: badge },
      { upsert: true, new: true, runValidators: true }
    );
    if (result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
  }

  console.log(`✅ Seeded ${BADGES.length} badges — ${created} created, ${updated} updated`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
