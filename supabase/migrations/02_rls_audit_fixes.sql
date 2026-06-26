-- ============================================================
-- Migration: 02_rls_audit_fixes.sql
-- Corrects gaps found during Phase 1 RLS audit:
--   1. boss_damage — expand SELECT to all authenticated users (leaderboard)
--   2. weekly_boss — allow INSERT for authenticated users (client-side boss creation)
--   3. guilds — allow INSERT/UPDATE for guild creators
--   4. Add boss_top_contributors view for the boss leaderboard
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- boss_damage: leaderboard requires all authenticated users
-- to read damage records (not just the owner).
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own boss damage" ON boss_damage;

CREATE POLICY "boss_damage_read_all_authenticated"
  ON boss_damage FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- weekly_boss: allow authenticated clients to INSERT a boss
-- when none exists (current bossStore behaviour).
-- Updates are handled by the complete_habit() RPC (SECURITY DEFINER).
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "weekly_boss_insert_authenticated"
  ON weekly_boss FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- guilds: allow guild creators to INSERT and UPDATE their guild
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "guilds_insert_by_creator"
  ON guilds FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "guilds_update_by_creator"
  ON guilds FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ─────────────────────────────────────────────────────────────
-- View: boss_top_contributors
-- Aggregates total damage per user per boss.
-- Safe: only exposes username + damage (no PII).
-- Used by the boss section of the home screen (Phase 2).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW boss_top_contributors AS
SELECT
  bd.boss_id,
  bd.user_id,
  p.username,
  SUM(bd.damage)  AS total_damage,
  COUNT(*)        AS hit_count
FROM boss_damage bd
JOIN profiles    p  ON p.id = bd.user_id
GROUP BY bd.boss_id, bd.user_id, p.username
ORDER BY total_damage DESC;

-- Grant authenticated users read access to the view.
GRANT SELECT ON boss_top_contributors TO authenticated;
