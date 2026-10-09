const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'levels.json');

let state = { users: {} };
let loaded = false;

function levelForXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * safeXp) / 100)) / 2));
}

function xpForLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return 50 * safeLevel * (safeLevel - 1);
}

function load() {
  if (loaded) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(DATA_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object' && parsed.users && typeof parsed.users === 'object') {
        state = parsed;
      }
    } catch (error) {
      console.error('Level store load error:', error);
    }
  }

  loaded = true;
}

function save() {
  load();
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function ensureUser(userId, profile = {}) {
  load();
  if (!state.users[userId]) {
    state.users[userId] = {
      xp: 0,
      level: 1,
      messages: 0,
      displayName: profile.displayName || profile.username || 'Member',
      username: profile.username || '',
      joinedAt: profile.joinedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    save();
  } else {
    const user = state.users[userId];
    if (profile.displayName) user.displayName = profile.displayName;
    if (profile.username) user.username = profile.username;
    if (profile.joinedAt && !user.joinedAt) user.joinedAt = profile.joinedAt;
    user.level = levelForXp(user.xp);
  }
  return { ...state.users[userId] };
}

function getUser(userId, profile = {}) {
  return ensureUser(userId, profile);
}

function addXp(userId, amount, profile = {}) {
  load();
  ensureUser(userId, profile);
  const user = state.users[userId];
  const oldLevel = levelForXp(user.xp);
  user.xp = Math.max(0, user.xp + Math.max(0, Math.floor(Number(amount) || 0)));
  user.messages = (user.messages || 0) + 1;
  if (profile.displayName) user.displayName = profile.displayName;
  if (profile.username) user.username = profile.username;
  user.level = levelForXp(user.xp);
  user.updatedAt = new Date().toISOString();
  save();

  return {
    ...user,
    oldLevel,
    leveledUp: user.level > oldLevel,
  };
}

function setLevel(userId, level, profile = {}) {
  load();
  ensureUser(userId, profile);
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const user = state.users[userId];
  user.xp = xpForLevel(safeLevel);
  user.level = safeLevel;
  if (profile.displayName) user.displayName = profile.displayName;
  if (profile.username) user.username = profile.username;
  user.updatedAt = new Date().toISOString();
  save();
  return { ...user };
}

function getTop(limit = 10) {
  load();
  return Object.entries(state.users)
    .map(([userId, data]) => ({ userId, ...data, level: levelForXp(data.xp) }))
    .sort((a, b) => (b.xp - a.xp) || (a.userId.localeCompare(b.userId)))
    .slice(0, Math.max(1, limit));
}

function progress(user) {
  const level = levelForXp(user.xp);
  const currentFloor = xpForLevel(level);
  const nextFloor = xpForLevel(level + 1);
  const earned = user.xp - currentFloor;
  const needed = nextFloor - currentFloor;
  const ratio = needed > 0 ? Math.max(0, Math.min(1, earned / needed)) : 1;
  return { level, currentFloor, nextFloor, earned, needed, ratio };
}

module.exports = {
  addXp,
  ensureUser,
  getTop,
  getUser,
  levelForXp,
  progress,
  setLevel,
  xpForLevel,
};
