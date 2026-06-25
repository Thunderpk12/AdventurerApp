/**
 * __tests__/gamification.test.ts
 * Unit tests for all pure functions in utils/gamification.ts
 * Run with: npx jest --testPathPattern=gamification
 */

import {
  xpThresholdForLevel,
  xpForNextLevel,
  xpWithinCurrentLevel,
  applyXpGain,
  calculateStreakUpdate,
  getBossDamage,
  defaultXpReward,
  defaultCoinReward,
  getTitleForLevel,
} from '../utils/gamification';

// ─────────────────────────────────────────────────────────────────────────────
// xpThresholdForLevel
// ─────────────────────────────────────────────────────────────────────────────

describe('xpThresholdForLevel', () => {
  test('level 1 requires 100 XP', () => {
    expect(xpThresholdForLevel(1)).toBe(100);
  });

  test('level 2 requires 283 XP (100 * 2^1.5 rounded)', () => {
    expect(xpThresholdForLevel(2)).toBe(283);
  });

  test('level 10 requires 3162 XP', () => {
    expect(xpThresholdForLevel(10)).toBe(3162);
  });

  test('threshold always increases with level', () => {
    for (let l = 1; l < 50; l++) {
      expect(xpThresholdForLevel(l + 1)).toBeGreaterThan(xpThresholdForLevel(l));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyXpGain
// ─────────────────────────────────────────────────────────────────────────────

describe('applyXpGain', () => {
  test('no level-up when XP gained is small', () => {
    const result = applyXpGain(0, 1, 50);
    expect(result.newLevel).toBe(1);
    expect(result.leveledUp).toBe(false);
    expect(result.levelsGained).toBe(0);
    expect(result.newTotalXp).toBe(50);
  });

  test('single level-up when XP crosses threshold', () => {
    // Level 1 → 2 threshold is 283 XP
    const result = applyXpGain(250, 1, 50);
    expect(result.newLevel).toBe(2);
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
  });

  test('multi level-up in one XP gain', () => {
    // Start at level 1, gain 1000 XP — should jump past levels 1, 2, 3, 4
    const result = applyXpGain(0, 1, 1000);
    expect(result.newLevel).toBeGreaterThan(3);
    expect(result.levelsGained).toBeGreaterThan(2);
    expect(result.leveledUp).toBe(true);
  });

  test('total XP accumulates correctly', () => {
    const result = applyXpGain(100, 1, 75);
    expect(result.newTotalXp).toBe(175);
  });

  test('gaining 0 XP changes nothing', () => {
    const result = applyXpGain(200, 2, 0);
    expect(result.newLevel).toBe(2);
    expect(result.leveledUp).toBe(false);
    expect(result.newTotalXp).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// xpForNextLevel / xpWithinCurrentLevel
// ─────────────────────────────────────────────────────────────────────────────

describe('xpForNextLevel', () => {
  test('always returns a positive number', () => {
    for (let l = 1; l <= 30; l++) {
      expect(xpForNextLevel(l)).toBeGreaterThan(0);
    }
  });
});

describe('xpWithinCurrentLevel', () => {
  test('returns XP progress within current level band', () => {
    // At level 1, threshold is 100. If total XP is 150, progress = 50
    expect(xpWithinCurrentLevel(150, 1)).toBe(50);
  });

  test('returns 0 when exactly at level threshold', () => {
    const threshold = xpThresholdForLevel(2);
    expect(xpWithinCurrentLevel(threshold, 2)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateStreakUpdate
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateStreakUpdate', () => {
  const makeDate = (offsetDays: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d;
  };

  test('no lastActive → streak starts at 1', () => {
    const result = calculateStreakUpdate(null);
    expect(result.newStreak).toBe(1);
    expect(result.streakExtended).toBe(true);
    expect(result.streakBroken).toBe(false);
  });

  test('same day → no change (newStreak = 0 sentinel)', () => {
    const today = new Date();
    const result = calculateStreakUpdate(today, today);
    expect(result.newStreak).toBe(0);
    expect(result.streakExtended).toBe(false);
    expect(result.streakBroken).toBe(false);
  });

  test('yesterday → streak extends (+1)', () => {
    const yesterday = makeDate(-1);
    const today     = new Date();
    const result    = calculateStreakUpdate(yesterday, today);
    expect(result.newStreak).toBe(1);    // caller adds this to existing streak
    expect(result.streakExtended).toBe(true);
    expect(result.streakBroken).toBe(false);
  });

  test('2 days ago → streak broken, resets to 1', () => {
    const twoDaysAgo = makeDate(-2);
    const today      = new Date();
    const result     = calculateStreakUpdate(twoDaysAgo, today);
    expect(result.newStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
    expect(result.streakExtended).toBe(false);
  });

  test('7 days ago → streak broken', () => {
    const weekAgo = makeDate(-7);
    const result  = calculateStreakUpdate(weekAgo, new Date());
    expect(result.streakBroken).toBe(true);
    expect(result.newStreak).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBossDamage
// ─────────────────────────────────────────────────────────────────────────────

describe('getBossDamage', () => {
  test('easy → 5 damage', () => {
    expect(getBossDamage('easy')).toBe(5);
  });

  test('medium → 15 damage', () => {
    expect(getBossDamage('medium')).toBe(15);
  });

  test('hard → 30 damage', () => {
    expect(getBossDamage('hard')).toBe(30);
  });

  test('case-insensitive', () => {
    expect(getBossDamage('EASY')).toBe(5);
    expect(getBossDamage('Hard')).toBe(30);
    expect(getBossDamage('MEDIUM')).toBe(15);
  });

  test('unknown difficulty falls back to 5', () => {
    expect(getBossDamage('legendary')).toBe(5);
    expect(getBossDamage('')).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// defaultXpReward / defaultCoinReward
// ─────────────────────────────────────────────────────────────────────────────

describe('defaultXpReward', () => {
  test('easy → 10 XP', ()  => expect(defaultXpReward('easy')).toBe(10));
  test('medium → 25 XP', () => expect(defaultXpReward('medium')).toBe(25));
  test('hard → 50 XP', ()  => expect(defaultXpReward('hard')).toBe(50));
  test('fallback → 10 XP', () => expect(defaultXpReward('unknown')).toBe(10));
});

describe('defaultCoinReward', () => {
  test('easy → 3 coins', ()   => expect(defaultCoinReward('easy')).toBe(3));
  test('medium → 7 coins', () => expect(defaultCoinReward('medium')).toBe(7));
  test('hard → 15 coins', ()  => expect(defaultCoinReward('hard')).toBe(15));
  test('fallback → 3 coins', () => expect(defaultCoinReward('unknown')).toBe(3));
});

// ─────────────────────────────────────────────────────────────────────────────
// getTitleForLevel
// ─────────────────────────────────────────────────────────────────────────────

describe('getTitleForLevel', () => {
  test('level 1 → Novice Explorer', () => {
    expect(getTitleForLevel(1)).toBe('Novice Explorer');
  });

  test('level 5 → Apprentice Adventurer', () => {
    expect(getTitleForLevel(5)).toBe('Apprentice Adventurer');
  });

  test('level 10 → Seasoned Wanderer', () => {
    expect(getTitleForLevel(10)).toBe('Seasoned Wanderer');
  });

  test('level 50 → Mythic Ascendant', () => {
    expect(getTitleForLevel(50)).toBe('Mythic Ascendant');
  });

  test('level 100 → Mythic Ascendant (max title)', () => {
    expect(getTitleForLevel(100)).toBe('Mythic Ascendant');
  });

  test('title increases or stays same with level', () => {
    const titles = [1, 4, 5, 9, 10, 14, 15, 19, 20, 29, 30, 49, 50].map(getTitleForLevel);
    // Each boundary should not decrease
    expect(titles[2]).not.toBe(titles[0]); // level 5 ≠ level 1
    expect(titles[4]).not.toBe(titles[2]); // level 10 ≠ level 5
  });
});
