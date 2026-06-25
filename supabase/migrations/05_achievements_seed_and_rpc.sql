-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 05: Achievements system — seed data + unlock RPC
-- Run this in: Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Add achievement_key column to user_achievements (for client-side lookup) ──

ALTER TABLE user_achievements
  ADD COLUMN IF NOT EXISTS achievement_key text;

-- ── Seed achievements table ──────────────────────────────────────────────────

DELETE FROM achievements WHERE true;

INSERT INTO achievements (name, description, category, condition_type, condition_value, xp_reward, badge_asset) VALUES
  ('First Flame',    'Complete your first quest',      'quests',  'total_completions', 1,   25,  '🔥'),
  ('Rising Star',    'Reach Level 5',                  'levels',  'level',             5,   50,  '⭐'),
  ('Week Warrior',   'Maintain a 7-day streak',        'streaks', 'streak',            7,   75,  '💎'),
  ('Gold Hoarder',   'Earn 500 GP total',              'coins',   'coins',             500, 50,  '🏆'),
  ('Centurion',      'Accumulate 100 XP',              'xp',      'xp',                100, 30,  '💯'),
  ('Hero',           'Reach Level 10',                 'levels',  'level',             10,  100, '⚔️'),
  ('Unstoppable',    'Complete 50 quests',             'quests',  'total_completions', 50,  150, '🌟'),
  ('Mythic',         'Reach Level 20',                 'levels',  'level',             20,  200, '🔮'),
  ('Streak Master',  'Maintain a 30-day streak',       'streaks', 'streak',            30,  300, '🔥'),
  ('Wealthy',        'Earn 2,000 GP total',            'coins',   'coins',             2000,100, '💰');

-- ── RPC: unlock_achievement (idempotent) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.unlock_achievement(
  p_user_id uuid,
  p_key     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement_id uuid;
  v_xp_reward      integer;
BEGIN
  -- Find achievement ID by key (matches badge_asset or name prefix — we use name as key)
  SELECT id, xp_reward INTO v_achievement_id, v_xp_reward
  FROM achievements
  WHERE LOWER(REPLACE(name, ' ', '_')) = LOWER(p_key)
     OR name = p_key
  LIMIT 1;

  IF v_achievement_id IS NULL THEN RETURN; END IF;

  -- Idempotent insert
  INSERT INTO user_achievements (user_id, achievement_id, achievement_key)
  VALUES (p_user_id, v_achievement_id, p_key)
  ON CONFLICT DO NOTHING;

  -- Grant XP reward
  IF v_xp_reward IS NOT NULL AND v_xp_reward > 0 THEN
    UPDATE profiles
    SET xp = xp + v_xp_reward
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- ── RLS: allow achievement_key column reads ───────────────────────────────────
-- (no new policy needed — existing "Users see own achievements" covers all columns)

SELECT 'Achievements seed + unlock RPC ready!' AS status;
