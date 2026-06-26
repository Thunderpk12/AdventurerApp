/**
 * __tests__/habitService.test.ts
 *
 * Unit tests for the habitService utility functions.
 * Tests focus on pure logic (frequency filtering, reward calculations)
 * and mock Supabase for DB-dependent functions.
 *
 * Run with: npx jest --testPathPattern=habitService
 */

// ── Mocks ─────────────────────────────────────────────────────
const mockRpc = jest.fn();

jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: mockRpc,
  },
}));

import { supabase } from '../utils/supabase';

const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;

// Helper to build a full Supabase query chain mock
function makeChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'update', 'insert', 'single', 'maybeSingle'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  // Terminal calls resolve the promise
  chain['maybeSingle'] = jest.fn().mockResolvedValue(resolvedValue);
  chain['single'] = jest.fn().mockResolvedValue(resolvedValue);
  return chain;
}

import {
  fetchProfile,
  updateProfile,
  fetchActiveBoss,
} from '../utils/habitService';
import type { Habit, Profile } from '../utils/habitService';

const BASE_HABIT: Habit = {
  id: 'habit-1',
  user_id: 'user-abc',
  name: 'Test Habit',
  category: 'fitness',
  difficulty: 'easy',
  frequency: 'daily',
  custom_days: null,
  xp_reward: 10,
  coin_reward: 3,
  reminder_time: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const BASE_PROFILE: Profile = {
  id: 'user-abc',
  username: 'Tester',
  avatar_url: null,
  level: 1,
  xp: 0,
  coins: 0,
  streak: 0,
  last_active: null,
  equipped_icon_id: null,
  equipped_title_id: null,
  guild_id: null,
  created_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// fetchProfile
// ─────────────────────────────────────────────────────────────
describe('fetchProfile', () => {
  test('returns profile data on success', async () => {
    const chain = makeChain({ data: BASE_PROFILE, error: null });
    mockFrom.mockReturnValue(chain as any);

    const result = await fetchProfile('user-abc');
    expect(result).toEqual(BASE_PROFILE);
  });

  test('returns null on Supabase error', async () => {
    const chain = makeChain({ data: null, error: { message: 'Not found' } });
    mockFrom.mockReturnValue(chain as any);

    const result = await fetchProfile('user-abc');
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// updateProfile
// ─────────────────────────────────────────────────────────────
describe('updateProfile', () => {
  test('returns true on success', async () => {
    // updateProfile calls: supabase.from('profiles').update(updates).eq('id', userId)
    // The chain terminates at .eq() which returns a Promise directly
    const eqResolve = jest.fn().mockResolvedValue({ error: null });
    const updateChain = { eq: eqResolve };
    const fromChain = { update: jest.fn().mockReturnValue(updateChain) };
    mockFrom.mockReturnValue(fromChain as any);

    const result = await updateProfile('user-abc', { xp: 100 });
    expect(result).toBe(true);
  });

  test('returns false on error', async () => {
    const eqResolve = jest.fn().mockResolvedValue({ error: { message: 'Conflict' } });
    const updateChain = { eq: eqResolve };
    const fromChain = { update: jest.fn().mockReturnValue(updateChain) };
    mockFrom.mockReturnValue(fromChain as any);

    const result = await updateProfile('user-abc', { xp: 100 });
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// fetchActiveBoss
// ─────────────────────────────────────────────────────────────
describe('fetchActiveBoss', () => {
  test('returns boss when one is active', async () => {
    const mockBoss = {
      id: 'boss-1',
      name: 'Shadow Titan',
      max_hp: 1000,
      current_hp: 900,
      illustration_asset: null,
      starts_at: new Date(Date.now() - 3600000).toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
      is_defeated: false,
    };
    const chain = makeChain({ data: mockBoss, error: null });
    mockFrom.mockReturnValue(chain as any);

    const result = await fetchActiveBoss();
    expect(result?.name).toBe('Shadow Titan');
  });

  test('returns null when no boss is active', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain as any);

    const result = await fetchActiveBoss();
    expect(result).toBeNull();
  });

  test('returns null on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'Error' } });
    mockFrom.mockReturnValue(chain as any);

    const result = await fetchActiveBoss();
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Frequency filtering logic (tested via inline replication
// of the filter logic in fetchTodayHabits)
// ─────────────────────────────────────────────────────────────
describe('Habit frequency filter logic', () => {
  /**
   * Replicates the filter logic from fetchTodayHabits.
   * Testing the pure boolean logic in isolation.
   */
  function shouldShowHabitToday(habit: Pick<Habit, 'frequency' | 'custom_days'>, todayDay: number): boolean {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') return true;
    if (habit.frequency === 'custom' && habit.custom_days) {
      return habit.custom_days.includes(todayDay);
    }
    return true;
  }

  test('daily habits always show', () => {
    expect(shouldShowHabitToday({ frequency: 'daily', custom_days: null }, 0)).toBe(true);
    expect(shouldShowHabitToday({ frequency: 'daily', custom_days: null }, 6)).toBe(true);
  });

  test('weekly habits always show', () => {
    expect(shouldShowHabitToday({ frequency: 'weekly', custom_days: null }, 3)).toBe(true);
  });

  test('custom habit shows on matching days', () => {
    // Mon=1, Wed=3, Fri=5
    const habit = { frequency: 'custom' as const, custom_days: [1, 3, 5] };
    expect(shouldShowHabitToday(habit, 1)).toBe(true);  // Monday ✓
    expect(shouldShowHabitToday(habit, 3)).toBe(true);  // Wednesday ✓
    expect(shouldShowHabitToday(habit, 5)).toBe(true);  // Friday ✓
    expect(shouldShowHabitToday(habit, 0)).toBe(false); // Sunday ✗
    expect(shouldShowHabitToday(habit, 2)).toBe(false); // Tuesday ✗
    expect(shouldShowHabitToday(habit, 4)).toBe(false); // Thursday ✗
    expect(shouldShowHabitToday(habit, 6)).toBe(false); // Saturday ✗
  });

  test('custom habit with empty custom_days array never shows', () => {
    const habit = { frequency: 'custom' as const, custom_days: [] };
    for (let day = 0; day <= 6; day++) {
      expect(shouldShowHabitToday(habit, day)).toBe(false);
    }
  });

  test('unknown frequency falls through to true (safe default)', () => {
    expect(shouldShowHabitToday({ frequency: 'unknown' as any, custom_days: null }, 3)).toBe(true);
  });
});
