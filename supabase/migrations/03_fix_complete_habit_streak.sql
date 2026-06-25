-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 03: Fix complete_habit RPC — add streak + last_active update
-- Run this in: Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_habit(
  p_habit_id     uuid,
  p_user_id      uuid,
  p_xp_earned    integer,
  p_coins_earned integer,
  p_boss_id      uuid    DEFAULT NULL,
  p_boss_damage  integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today       date := CURRENT_DATE;
  v_last_active date;
  v_new_streak  integer;
  v_comp_id     uuid;
BEGIN
  -- ── Guard: already completed today ──────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM habit_completions
    WHERE habit_id = p_habit_id
      AND user_id  = p_user_id
      AND completed_at::date = v_today
  ) THEN
    RETURN json_build_object('status', 'already_completed');
  END IF;

  -- ── Insert completion record ─────────────────────────────────────────────
  INSERT INTO habit_completions (habit_id, user_id, xp_earned, coins_earned)
  VALUES (p_habit_id, p_user_id, p_xp_earned, p_coins_earned)
  RETURNING id INTO v_comp_id;

  -- ── Calculate new streak ─────────────────────────────────────────────────
  SELECT last_active INTO v_last_active
  FROM profiles WHERE id = p_user_id;

  v_new_streak := CASE
    WHEN v_last_active IS NULL          THEN 1               -- first ever activity
    WHEN v_last_active = v_today        THEN (SELECT streak FROM profiles WHERE id = p_user_id)  -- already active today, no change
    WHEN v_last_active = v_today - 1   THEN (SELECT streak FROM profiles WHERE id = p_user_id) + 1  -- consecutive day
    ELSE 1                                                    -- streak broken
  END;

  -- ── Update profile: XP, coins, streak, last_active ──────────────────────
  UPDATE profiles
  SET
    xp          = xp + p_xp_earned,
    coins       = coins + p_coins_earned,
    streak      = v_new_streak,
    last_active = v_today
  WHERE id = p_user_id;

  -- ── Level-up: recalculate level from total XP ────────────────────────────
  UPDATE profiles
  SET level = CASE
    WHEN xp >= 14142 THEN 50
    WHEN xp >= 8660  THEN 40
    WHEN xp >= 5196  THEN 30
    WHEN xp >= 2828  THEN 25
    WHEN xp >= 2000  THEN 20
    WHEN xp >= 1299  THEN 18
    WHEN xp >= 800   THEN 15
    WHEN xp >= 424   THEN 12
    WHEN xp >= 245   THEN 10
    WHEN xp >= 100   THEN 8
    WHEN xp >= 42    THEN 5
    ELSE 1
  END
  WHERE id = p_user_id;

  -- ── Boss damage ──────────────────────────────────────────────────────────
  IF p_boss_id IS NOT NULL AND p_boss_damage > 0 THEN
    INSERT INTO boss_damage (boss_id, user_id, damage, habit_completion_id)
    VALUES (p_boss_id, p_user_id, p_boss_damage, v_comp_id);

    UPDATE weekly_boss
    SET
      current_hp  = GREATEST(0, current_hp - p_boss_damage),
      is_defeated = (GREATEST(0, current_hp - p_boss_damage) = 0)
    WHERE id = p_boss_id;
  END IF;

  -- ── Return updated profile state for client sync ─────────────────────────
  RETURN (
    SELECT json_build_object(
      'status',       'ok',
      'streak',       streak,
      'last_active',  last_active,
      'xp',           xp,
      'coins',        coins,
      'level',        level
    )
    FROM profiles WHERE id = p_user_id
  );
END;
$$;
