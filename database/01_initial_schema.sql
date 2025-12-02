-- NFL Survivor Pool - Initial Database Schema
-- Run this first to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- POOL SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pool_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_year INTEGER NOT NULL UNIQUE,
  entry_fee DECIMAL(10, 2) DEFAULT 50.00,
  buyback_fee DECIMAL(10, 2) DEFAULT 25.00,
  total_pot DECIMAL(10, 2) DEFAULT 0.00,
  max_strikes INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NFL TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nfl_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  abbreviation VARCHAR(5) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  conference VARCHAR(3) CHECK (conference IN ('AFC', 'NFC')),
  division VARCHAR(10) CHECK (division IN ('North', 'South', 'East', 'West')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WEEKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER NOT NULL,
  season_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_number, season_year)
);

-- ============================================
-- PLAYERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  strikes INTEGER DEFAULT 0 CHECK (strikes >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  is_eliminated BOOLEAN DEFAULT FALSE,
  has_bought_back BOOLEAN DEFAULT FALSE,
  entry_fee_paid BOOLEAN DEFAULT FALSE,
  buyback_fee_paid BOOLEAN DEFAULT FALSE,
  season_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PICKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES nfl_teams(id) ON DELETE CASCADE,
  team_won BOOLEAN DEFAULT NULL,
  is_strike BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, week_id),
  UNIQUE(player_id, team_id)
);

-- ============================================
-- NFL GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS nfl_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES nfl_teams(id),
  away_team_id UUID NOT NULL REFERENCES nfl_teams(id),
  home_score INTEGER,
  away_score INTEGER,
  home_won BOOLEAN,
  away_won BOOLEAN,
  game_status VARCHAR(20) DEFAULT 'scheduled' CHECK (game_status IN ('scheduled', 'in_progress', 'final')),
  game_date TIMESTAMPTZ,
  espn_event_id VARCHAR(50) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_nfl_games_week ON nfl_games(week_id);
CREATE INDEX IF NOT EXISTS idx_nfl_games_espn_id ON nfl_games(espn_event_id);
CREATE INDEX IF NOT EXISTS idx_nfl_games_status ON nfl_games(game_status);
CREATE INDEX IF NOT EXISTS idx_picks_player ON picks(player_id);
CREATE INDEX IF NOT EXISTS idx_picks_week ON picks(week_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE pool_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfl_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfl_games ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access" ON pool_settings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON nfl_teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON weeks FOR SELECT USING (true);
CREATE POLICY "Public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON picks FOR SELECT USING (true);
CREATE POLICY "Public read access" ON nfl_games FOR SELECT USING (true);

-- Service role full access (for backend operations)
CREATE POLICY "Service role full access" ON pool_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON nfl_teams FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON weeks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON players FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON picks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON nfl_games FOR ALL USING (auth.role() = 'service_role');
