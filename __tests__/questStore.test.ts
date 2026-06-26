/**
 * __tests__/questStore.test.ts
 *
 * Unit tests for the questStore Zustand store.
 * Supabase, habitService and playerStore are mocked.
 *
 * Run with: npx jest --testPathPattern=questStore
 */

// ── Mocks ─────────────────────────────────────────────────────
jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../utils/habitService', () => ({
  fetchTodayHabits: jest.fn(),
  completeHabit: jest.fn(),
  createHabit: jest.fn(),
  updateHabit: jest.fn(),
  deleteHabit: jest.fn(),
}));

jest.mock('../store/playerStore', () => ({
  usePlayerStore: {
    getState: jest.fn(() => ({
      updateStreak: jest.fn().mockResolvedValue(undefined),
      loadProfile: jest.fn().mockResolvedValue(undefined),
      checkAchievements: jest.fn().mockResolvedValue([]),
      profile: MOCK_PROFILE,
    })),
    setState: jest.fn(),
  },
}));

import { useQuestStore } from '../store/questStore';
import * as habitService from '../utils/habitService';

const mockFetchTodayHabits = habitService.fetchTodayHabits as jest.MockedFunction<typeof habitService.fetchTodayHabits>;
const mockCompleteHabit = habitService.completeHabit as jest.MockedFunction<typeof habitService.completeHabit>;
const mockCreateHabit = habitService.createHabit as jest.MockedFunction<typeof habitService.createHabit>;
const mockUpdateHabit = habitService.updateHabit as jest.MockedFunction<typeof habitService.updateHabit>;
const mockDeleteHabit = habitService.deleteHabit as jest.MockedFunction<typeof habitService.deleteHabit>;

const MOCK_PROFILE: habitService.Profile = {
  id: 'user-123',
  username: 'Hero',
  avatar_url: null,
  level: 2,
  xp: 300,
  coins: 50,
  streak: 4,
  last_active: null,
  equipped_icon_id: null,
  equipped_title_id: null,
  guild_id: null,
  created_at: '2024-01-01T00:00:00Z',
};

const MOCK_HABIT: habitService.Habit = {
  id: 'habit-abc',
  user_id: 'user-123',
  name: 'Morning Run',
  category: 'fitness',
  difficulty: 'medium',
  frequency: 'daily',
  custom_days: null,
  xp_reward: 25,
  coin_reward: 7,
  reminder_time: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  isCompletedToday: false,
};

beforeEach(() => {
  useQuestStore.getState().reset();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// loadTodayHabits
// ─────────────────────────────────────────────────────────────
describe('loadTodayHabits', () => {
  test('populates habits list from service', async () => {
    mockFetchTodayHabits.mockResolvedValue([MOCK_HABIT]);

    await useQuestStore.getState().loadTodayHabits('user-123');

    const { habits, isLoading } = useQuestStore.getState();
    expect(habits).toHaveLength(1);
    expect(habits[0].name).toBe('Morning Run');
    expect(isLoading).toBe(false);
  });

  test('returns empty array when service returns []', async () => {
    mockFetchTodayHabits.mockResolvedValue([]);

    await useQuestStore.getState().loadTodayHabits('user-123');

    expect(useQuestStore.getState().habits).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// completeQuest
// ─────────────────────────────────────────────────────────────
describe('completeQuest', () => {
  beforeEach(() => {
    useQuestStore.setState({ habits: [{ ...MOCK_HABIT }] });
  });

  test('applies optimistic update immediately', async () => {
    // Delay the resolution so we can inspect intermediate state
    let resolveComplete!: (v: Awaited<ReturnType<typeof habitService.completeHabit>>) => void;
    mockCompleteHabit.mockReturnValue(
      new Promise((res) => { resolveComplete = res; })
    );

    const promise = useQuestStore
      .getState()
      .completeQuest('habit-abc', 'user-123', MOCK_PROFILE, null);

    // Check optimistic update BEFORE the promise resolves
    expect(useQuestStore.getState().habits[0].isCompletedToday).toBe(true);

    resolveComplete({ success: true, xpGained: 25, coinsGained: 7, leveledUp: false, newLevel: 2 });
    await promise;
  });

  test('returns success result with XP/coin values', async () => {
    mockCompleteHabit.mockResolvedValue({
      success: true,
      xpGained: 25,
      coinsGained: 7,
      leveledUp: false,
      newLevel: 2,
    });

    const result = await useQuestStore
      .getState()
      .completeQuest('habit-abc', 'user-123', MOCK_PROFILE, null);

    expect(result.success).toBe(true);
    expect(result.xpGained).toBe(25);
    expect(result.coinsGained).toBe(7);
  });

  test('rolls back optimistic update on failure', async () => {
    mockCompleteHabit.mockResolvedValue({
      success: false,
      xpGained: 0,
      coinsGained: 0,
      leveledUp: false,
      newLevel: 2,
    });

    await useQuestStore
      .getState()
      .completeQuest('habit-abc', 'user-123', MOCK_PROFILE, null);

    expect(useQuestStore.getState().habits[0].isCompletedToday).toBe(false);
    expect(useQuestStore.getState().error).toMatch(/failed/i);
  });

  test('returns failure immediately when habit is already completed', async () => {
    useQuestStore.setState({ habits: [{ ...MOCK_HABIT, isCompletedToday: true }] });

    const result = await useQuestStore
      .getState()
      .completeQuest('habit-abc', 'user-123', MOCK_PROFILE, null);

    expect(result.success).toBe(false);
    expect(mockCompleteHabit).not.toHaveBeenCalled();
  });

  test('returns failure when habit is not found', async () => {
    const result = await useQuestStore
      .getState()
      .completeQuest('nonexistent-id', 'user-123', MOCK_PROFILE, null);

    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// createQuest
// ─────────────────────────────────────────────────────────────
describe('createQuest', () => {
  const payload: habitService.CreateHabitPayload = {
    name: 'Read 30 min',
    category: 'study',
    difficulty: 'easy',
    frequency: 'daily',
    xp_reward: 10,
    coin_reward: 3,
  };

  test('adds new habit to the list on success', async () => {
    mockCreateHabit.mockResolvedValue({ ...MOCK_HABIT, id: 'habit-new', name: 'Read 30 min' });

    const result = await useQuestStore.getState().createQuest('user-123', payload);

    expect(result).toBe(true);
    const habits = useQuestStore.getState().habits;
    expect(habits.some((h) => h.id === 'habit-new')).toBe(true);
  });

  test('returns false and does not mutate state when service fails', async () => {
    mockCreateHabit.mockResolvedValue(null);

    const result = await useQuestStore.getState().createQuest('user-123', payload);

    expect(result).toBe(false);
    expect(useQuestStore.getState().habits).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// deleteQuest
// ─────────────────────────────────────────────────────────────
describe('deleteQuest', () => {
  beforeEach(() => {
    useQuestStore.setState({ habits: [{ ...MOCK_HABIT }] });
  });

  test('removes habit from list on success', async () => {
    mockDeleteHabit.mockResolvedValue(true);

    const result = await useQuestStore.getState().deleteQuest('habit-abc');

    expect(result).toBe(true);
    expect(useQuestStore.getState().habits).toHaveLength(0);
  });

  test('leaves list unchanged when service fails', async () => {
    mockDeleteHabit.mockResolvedValue(false);

    const result = await useQuestStore.getState().deleteQuest('habit-abc');

    expect(result).toBe(false);
    expect(useQuestStore.getState().habits).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// editQuest
// ─────────────────────────────────────────────────────────────
describe('editQuest', () => {
  beforeEach(() => {
    useQuestStore.setState({ habits: [{ ...MOCK_HABIT }] });
  });

  test('updates habit in list on success', async () => {
    mockUpdateHabit.mockResolvedValue(true);

    const result = await useQuestStore.getState().editQuest('habit-abc', { name: 'Evening Run' });

    expect(result).toBe(true);
    expect(useQuestStore.getState().habits[0].name).toBe('Evening Run');
  });

  test('leaves list unchanged when service fails', async () => {
    mockUpdateHabit.mockResolvedValue(false);

    const result = await useQuestStore.getState().editQuest('habit-abc', { name: 'Evening Run' });

    expect(result).toBe(false);
    expect(useQuestStore.getState().habits[0].name).toBe('Morning Run');
  });
});
