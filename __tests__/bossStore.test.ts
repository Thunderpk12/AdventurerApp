/**
 * __tests__/bossStore.test.ts
 *
 * Unit tests for the bossStore Zustand store.
 * Supabase is mocked completely.
 *
 * Run with: npx jest --testPathPattern=bossStore
 */

// ── Mocks ─────────────────────────────────────────────────────
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockLte = jest.fn();
const mockGte = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

// Chain builder — each call returns an object with all chain methods
const chainMethods = () => ({
  select: mockSelect,
  insert: mockInsert,
  eq: mockEq,
  lte: mockLte,
  gte: mockGte,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
});

// Reset chain mocks before each test
const resetChain = () => {
  mockSelect.mockReturnValue(chainMethods());
  mockInsert.mockReturnValue(chainMethods());
  mockEq.mockReturnValue(chainMethods());
  mockLte.mockReturnValue(chainMethods());
  mockGte.mockReturnValue(chainMethods());
  mockOrder.mockReturnValue(chainMethods());
  mockLimit.mockReturnValue(chainMethods());
};

jest.mock('../utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => chainMethods()),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../utils/habitService', () => ({
  fetchActiveBoss: jest.fn(),
}));

import { useBossStore } from '../store/bossStore';
import * as habitService from '../utils/habitService';
import { supabase } from '../utils/supabase';

const mockFetchActiveBoss = habitService.fetchActiveBoss as jest.MockedFunction<typeof habitService.fetchActiveBoss>;
const mockFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;

const MOCK_BOSS: habitService.WeeklyBoss = {
  id: 'boss-001',
  name: 'Shadow Titan',
  max_hp: 1000,
  current_hp: 750,
  illustration_asset: null,
  starts_at: new Date().toISOString(),
  ends_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  is_defeated: false,
};

beforeEach(() => {
  useBossStore.getState().reset();
  jest.clearAllMocks();
  resetChain();
});

// ─────────────────────────────────────────────────────────────
// loadBoss
// ─────────────────────────────────────────────────────────────
describe('loadBoss', () => {
  test('loads existing active boss from service', async () => {
    mockFetchActiveBoss.mockResolvedValue(MOCK_BOSS);

    await useBossStore.getState().loadBoss();

    const { boss, isLoading } = useBossStore.getState();
    expect(boss).not.toBeNull();
    expect(boss?.name).toBe('Shadow Titan');
    expect(boss?.current_hp).toBe(750);
    expect(isLoading).toBe(false);
  });

  test('auto-creates a new boss when none is active', async () => {
    mockFetchActiveBoss.mockResolvedValue(null);

    // Mock the INSERT chain for boss creation
    const insertSelect = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: MOCK_BOSS, error: null }),
    });
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({ select: insertSelect }),
    } as any);

    await useBossStore.getState().loadBoss();

    const { boss } = useBossStore.getState();
    expect(boss).not.toBeNull();
  });

  test('sets boss to null if creation fails', async () => {
    mockFetchActiveBoss.mockResolvedValue(null);

    // Mock failed INSERT
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation' } }),
        }),
      }),
    } as any);

    await useBossStore.getState().loadBoss();

    // Boss should be null since creation failed
    expect(useBossStore.getState().boss).toBeNull();
    expect(useBossStore.getState().isLoading).toBe(false);
  });

  test('sets isLoading to false after load', async () => {
    mockFetchActiveBoss.mockResolvedValue(MOCK_BOSS);
    await useBossStore.getState().loadBoss();
    expect(useBossStore.getState().isLoading).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// reset
// ─────────────────────────────────────────────────────────────
describe('reset', () => {
  test('clears boss back to null', async () => {
    mockFetchActiveBoss.mockResolvedValue(MOCK_BOSS);
    await useBossStore.getState().loadBoss();
    expect(useBossStore.getState().boss).not.toBeNull();

    useBossStore.getState().reset();
    expect(useBossStore.getState().boss).toBeNull();
    expect(useBossStore.getState().isLoading).toBe(false);
  });
});
