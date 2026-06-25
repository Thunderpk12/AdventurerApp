-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 04: Weekly Boss Auto-Creation via pg_cron
-- Run this in: Supabase Dashboard → SQL Editor
--
-- PREREQUISITE: Enable the pg_cron extension first:
--   Dashboard → Database → Extensions → search "pg_cron" → Enable
--
-- If pg_cron is not available on your plan, see the Edge Function alternative
-- in supabase/functions/weekly-boss-reset/ (to be created separately).
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Helper function: create boss for a given week ────────────────────────────

CREATE OR REPLACE FUNCTION public.create_weekly_boss_if_missing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start  timestamptz := date_trunc('week', now());
  v_week_end    timestamptz := date_trunc('week', now()) + interval '7 days';
  v_boss_names  text[] := ARRAY[
    'Shadow Colossus',
    'Infernal Wyvern',
    'Void Titan',
    'Corrupted Golem',
    'Storm Leviathan',
    'Abyssal Hydra',
    'Iron Behemoth',
    'Chaos Harbinger'
  ];
  v_name        text;
BEGIN
  -- Skip if a boss already exists for this week
  IF EXISTS (
    SELECT 1 FROM public.weekly_boss
    WHERE starts_at = v_week_start
  ) THEN
    RETURN;
  END IF;

  -- Pick a boss name based on week number (cycles through list)
  v_name := v_boss_names[
    (EXTRACT(WEEK FROM now())::integer % array_length(v_boss_names, 1)) + 1
  ];

  INSERT INTO public.weekly_boss (name, max_hp, current_hp, starts_at, ends_at, is_defeated)
  VALUES (v_name, 10000, 10000, v_week_start, v_week_end, false);
END;
$$;

-- ── Schedule: every Monday at 00:00 UTC ─────────────────────────────────────

-- Remove any existing job with this name (idempotent)
SELECT cron.unschedule('create-weekly-boss')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'create-weekly-boss'
);

SELECT cron.schedule(
  'create-weekly-boss',
  '0 0 * * 1',   -- every Monday at 00:00 UTC
  'SELECT public.create_weekly_boss_if_missing();'
);

-- ── Run immediately for this week (in case current week has no boss) ─────────
SELECT public.create_weekly_boss_if_missing();

SELECT 'Weekly boss cron job scheduled successfully!' AS status;
