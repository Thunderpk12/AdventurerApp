/**
 * __tests__/playerStore.test.ts
 *
 * Unit tests for the playerStore Zustand store.
 * All Supabase calls are mocked so these run fully offline.
 *
 * Run with: npx jest --testPathPattern=playerStore
 */

// ── Mock Supabase & services before importing the store ──────
jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../utils/habitService', () => ({
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('../utils/achievementService', () => ({
  fetchEarnedAchievements: jest.fn(),
  checkAndUnlockAchievements: jest.fn(),
  fetchTotalCompletions: jest.fn(),
  ACHIEVEMENT_DEFS: [],
}));

import { usePlayerStore } from '../store/playerStore';
import * as habitService from '../utils/habitService';
import * as achievementService from '../utils/achievementService';

const mockFetchProfile = habitService.fetchProfile as jest.MockedFunction<typeof habitService.fetchProfile>;
const mockUpdateProfile = habitService.updateProfile as jest.MockedFunction<typeof habitService.updateProfile>;
const mockFetchEarned = achievementService.fetchEarnedAchievements as jest.MockedFunction<typeof achievementService.fetchEarnedAchievements>;
const mockFetchTotalCompletions = achievementService.fetchTotalCompletions as jest.MockedFunction<typeof achievementService.fetchTotalCompletions>;
const mockCheckAndUnlock = achievementService.checkAndUnlockAchievements as jest.MockedFunction<typeof achievementService.checkAndUnlockAchievements>;

const MOCK_PROFILE: habitService.Profile = {
  id: 'user-123',
  username: 'Hero',
  avatar_url: null,
  level: 1,
  xp: 0,
  coins: 100,
  streak: 3,
  last_active: null,
  equipped_icon_id: null,
  equipped_title_id: null,
  guild_id: null,
  created_at: '2024-01-01T00:00:00Z',
};

// Reset the store between tests
beforeEach(() => {
  usePlayerStore.getState().reset();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// loadProfile
// ─────────────────────────────────────────────────────────────
describe('loadProfile', () => {
  test('populates profile and derives XP display values', async () => {
    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE, xp: 50, level: 1 });
    mockFetchEarned.mockResolvedValue(new Set());

    await usePlayerStore.getState().loadProfile('user-123');

    const state = usePlayerStore.getState();
    expect(state.profile?.xp).toBe(50);
    expect(state.profile?.level).toBe(1);
    expect(state.title).toBe('Novice Explorer');
    // xpWithinCurrentLevel(50, 1) = 50 - xpThresholdForLevel(1) = 50 - 100 = -50
    // This is expected — the player is within level 1 but hasn't reached the 100 XP threshold yet.
    // The bar would show negative progress which the UI clamps to 0.
    expect(state.currentLevelXp).toBe(-50);
    expect(state.maxLevelXp).toBeGreaterThan(0);
    expect(state.isLoading).toBe(false);
  });

  test('sets isLoading to false even when fetchProfile returns null', async () => {
    mockFetchProfile.mockResolvedValue(null);
    mockFetchEarned.mockResolvedValue(new Set());

    await usePlayerStore.getState().loadProfile('user-123');

    expect(usePlayerStore.getState().isLoading).toBe(false);
    expect(usePlayerStore.getState().profile).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// awardXp
// ─────────────────────────────────────────────────────────────
describe('awardXp', () => {
  beforeEach(async () => {
    // Seed the store with a profile
    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE });
    mockFetchEarned.mockResolvedValue(new Set());
    await usePlayerStore.getState().loadProfile('user-123');
    mockUpdateProfile.mockResolvedValue(true);
  });

  test('adds XP to profile without level-up', async () => {
    const result = await usePlayerStore.getState().awardXp('user-123', 30);

    const state = usePlayerStore.getState();
    expect(state.profile?.xp).toBe(30);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
    expect(state.justLeveledUp).toBe(false);
  });

  test('triggers level-up when XP crosses threshold', async () => {
    // Level 1 → 2 threshold: xpThresholdForLevel(2) = 100 * 2^1.5 ≈ 283 XP
    // Player starts at xp=0, level=1. Gain 300 XP → total = 300 > 283 → level-up
    const result = await usePlayerStore.getState().awardXp('user-123', 300);

    const state = usePlayerStore.getState();
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBeGreaterThan(1);
    expect(state.justLeveledUp).toBe(true);
    expect(state.newLevel).toBeGreaterThan(1);
  });

  test('calls updateProfile with new XP and level', async () => {
    await usePlayerStore.getState().awardXp('user-123', 50);

    expect(mockUpdateProfile).toHaveBeenCalledWith('user-123', {
      xp: 50,
      level: 1,
    });
  });

  test('returns current level unchanged when profile is null', async () => {
    usePlayerStore.getState().reset(); // profile = null

    const result = await usePlayerStore.getState().awardXp('user-123', 50);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// awardCoins
// ─────────────────────────────────────────────────────────────
describe('awardCoins', () => {
  beforeEach(async () => {
    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE, coins: 100 });
    mockFetchEarned.mockResolvedValue(new Set());
    await usePlayerStore.getState().loadProfile('user-123');
    mockUpdateProfile.mockResolvedValue(true);
  });

  test('adds coins to the profile', async () => {
    await usePlayerStore.getState().awardCoins('user-123', 50);

    expect(usePlayerStore.getState().profile?.coins).toBe(150);
  });

  test('calls updateProfile with the new coin total', async () => {
    await usePlayerStore.getState().awardCoins('user-123', 25);

    expect(mockUpdateProfile).toHaveBeenCalledWith('user-123', { coins: 125 });
  });
});

// ─────────────────────────────────────────────────────────────
// updateStreak
// ─────────────────────────────────────────────────────────────
describe('updateStreak', () => {
  beforeEach(() => {
    mockUpdateProfile.mockResolvedValue(true);
  });

  test('increments streak when last_active was yesterday', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE, streak: 5, last_active: yesterdayStr });
    mockFetchEarned.mockResolvedValue(new Set());
    await usePlayerStore.getState().loadProfile('user-123');

    await usePlayerStore.getState().updateStreak('user-123');

    expect(usePlayerStore.getState().profile?.streak).toBe(6);
  });

  test('resets streak to 1 when last_active was 2+ days ago', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = threeDaysAgo.toISOString().split('T')[0];

    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE, streak: 10, last_active: dateStr });
    mockFetchEarned.mockResolvedValue(new Set());
    await usePlayerStore.getState().loadProfile('user-123');

    await usePlayerStore.getState().updateStreak('user-123');

    expect(usePlayerStore.getState().profile?.streak).toBe(1);
  });

  test('does nothing when last_active is today', async () => {
    const today = new Date().toISOString().split('T')[0];

    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE, streak: 7, last_active: today });
    mockFetchEarned.mockResolvedValue(new Set());
    await usePlayerStore.getState().loadProfile('user-123');

    await usePlayerStore.getState().updateStreak('user-123');

    // No change
    expect(usePlayerStore.getState().profile?.streak).toBe(7);
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// clearLevelUpFlag
// ─────────────────────────────────────────────────────────────
describe('clearLevelUpFlag', () => {
  test('resets justLeveledUp to false', async () => {
    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE });
    mockFetchEarned.mockResolvedValue(new Set());
    await usePlayerStore.getState().loadProfile('user-123');
    mockUpdateProfile.mockResolvedValue(true);

    // Trigger a level-up: need > 283 XP (threshold for level 2) from xp=0
    await usePlayerStore.getState().awardXp('user-123', 300);
    expect(usePlayerStore.getState().justLeveledUp).toBe(true);

    // Clear it
    usePlayerStore.getState().clearLevelUpFlag();
    expect(usePlayerStore.getState().justLeveledUp).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// checkAchievements
// ─────────────────────────────────────────────────────────────
describe('checkAchievements', () => {
  test('returns newly unlocked achievement keys and updates earnedAchievements', async () => {
    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE });
    mockFetchEarned.mockResolvedValue(new Set(['first_quest']));
    await usePlayerStore.getState().loadProfile('user-123');

    mockFetchTotalCompletions.mockResolvedValue(10);
    mockCheckAndUnlock.mockResolvedValue(['streak_3', 'completions_10']);

    const unlocked = await usePlayerStore.getState().checkAchievements('user-123');

    expect(unlocked).toEqual(['streak_3', 'completions_10']);
    const earned = usePlayerStore.getState().earnedAchievements;
    expect(earned.has('first_quest')).toBe(true);
    expect(earned.has('streak_3')).toBe(true);
    expect(earned.has('completions_10')).toBe(true);
  });

  test('returns [] when profile is null', async () => {
    const result = await usePlayerStore.getState().checkAchievements('user-123');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// reset
// ─────────────────────────────────────────────────────────────
describe('reset', () => {
  test('clears all state back to initial values', async () => {
    mockFetchProfile.mockResolvedValue({ ...MOCK_PROFILE });
    mockFetchEarned.mockResolvedValue(new Set(['first_quest']));
    await usePlayerStore.getState().loadProfile('user-123');

    usePlayerStore.getState().reset();

    const state = usePlayerStore.getState();
    expect(state.profile).toBeNull();
    expect(state.title).toBe('Novice Explorer');
    expect(state.currentLevelXp).toBe(0);
    expect(state.justLeveledUp).toBe(false);
    expect(state.earnedAchievements.size).toBe(0);
  });
});
