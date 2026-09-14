// Keep this table in sync by hand with REWARD_TABLE in src/pages/rewards-calculator.tsx.
const REWARD_TABLE = [
  { level: 1, xpPerHour: 150, goldPerHour: 30, tier: "Beginner", range: "1 - 4" },
  { level: 2, xpPerHour: 200, goldPerHour: 50, tier: "Beginner", range: "1 - 4" },
  { level: 3, xpPerHour: 450, goldPerHour: 100, tier: "Beginner", range: "1 - 4" },
  { level: 4, xpPerHour: 600, goldPerHour: 150, tier: "Beginner", range: "1 - 4" },
  { level: 5, xpPerHour: 800, goldPerHour: 300, tier: "Intermediate", range: "5 - 8" },
  { level: 6, xpPerHour: 1000, goldPerHour: 500, tier: "Intermediate", range: "5 - 8" },
  { level: 7, xpPerHour: 1200, goldPerHour: 800, tier: "Intermediate", range: "5 - 8" },
  { level: 8, xpPerHour: 1500, goldPerHour: 1000, tier: "Intermediate", range: "5 - 8" },
  { level: 9, xpPerHour: 1800, goldPerHour: 1500, tier: "Adept", range: "9 - 12" },
  { level: 10, xpPerHour: 2000, goldPerHour: 2000, tier: "Adept", range: "9 - 12" },
  { level: 11, xpPerHour: 2300, goldPerHour: 2500, tier: "Adept", range: "9 - 12" },
  { level: 12, xpPerHour: 2500, goldPerHour: 3000, tier: "Adept", range: "9 - 12" },
  { level: 13, xpPerHour: 2800, goldPerHour: 5000, tier: "Expert", range: "13 - 16" },
  { level: 14, xpPerHour: 3000, goldPerHour: 5500, tier: "Expert", range: "13 - 16" },
  { level: 15, xpPerHour: 3500, goldPerHour: 6000, tier: "Expert", range: "13 - 16" },
  { level: 16, xpPerHour: 4000, goldPerHour: 6500, tier: "Expert", range: "13 - 16" },
  { level: 17, xpPerHour: 5000, goldPerHour: 7500, tier: "Master", range: "17 - 20" },
  { level: 18, xpPerHour: 5500, goldPerHour: 8000, tier: "Master", range: "17 - 20" },
  { level: 19, xpPerHour: 6000, goldPerHour: 8500, tier: "Master", range: "17 - 20" },
  { level: 20, xpPerHour: 7000, goldPerHour: 9000, tier: "Master", range: "17 - 20" },
  { level: 21, xpPerHour: 7500, goldPerHour: 9500, tier: "Paragon", range: "20+" },
  { level: 22, xpPerHour: 8000, goldPerHour: 10000, tier: "Paragon", range: "20+" },
];

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRewardRow(level) {
  return REWARD_TABLE[clampNumber(level, 1, 22) - 1];
}

module.exports = { REWARD_TABLE, getRewardRow };
