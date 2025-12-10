-- Update RLS Policies for Supabase Auth
-- Run this to enable authenticated admin access without service role key

-- ============================================
-- DROP OLD SERVICE ROLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Service role full access" ON pool_settings;
DROP POLICY IF EXISTS "Service role full access" ON nfl_teams;
DROP POLICY IF EXISTS "Service role full access" ON weeks;
DROP POLICY IF EXISTS "Service role full access" ON players;
DROP POLICY IF EXISTS "Service role full access" ON picks;
DROP POLICY IF EXISTS "Service role full access" ON nfl_games;

-- ============================================
-- CREATE NEW AUTHENTICATED USER POLICIES
-- ============================================

-- Pool Settings: Authenticated users can write
CREATE POLICY "Authenticated users can modify pool settings"
  ON pool_settings
  FOR ALL
  USING (auth.role() = 'authenticated');

-- NFL Teams: Authenticated users can write
CREATE POLICY "Authenticated users can modify teams"
  ON nfl_teams
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Weeks: Authenticated users can write
CREATE POLICY "Authenticated users can modify weeks"
  ON weeks
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Players: Authenticated users can write
CREATE POLICY "Authenticated users can modify players"
  ON players
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Picks: Authenticated users can write
CREATE POLICY "Authenticated users can modify picks"
  ON picks
  FOR ALL
  USING (auth.role() = 'authenticated');

-- NFL Games: Authenticated users can write
CREATE POLICY "Authenticated users can modify games"
  ON nfl_games
  FOR ALL
  USING (auth.role() = 'authenticated');
