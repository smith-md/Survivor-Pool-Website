-- Create nfl_games table to store game results from ESPN API
CREATE TABLE nfl_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL REFERENCES nfl_teams(id) ON DELETE CASCADE,
    away_team_id UUID NOT NULL REFERENCES nfl_teams(id) ON DELETE CASCADE,
    home_score INTEGER,
    away_score INTEGER,
    home_won BOOLEAN,
    away_won BOOLEAN,
    game_status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'final'
    game_date TIMESTAMPTZ,
    espn_event_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_game_status CHECK (game_status IN ('scheduled', 'in_progress', 'final'))
);

-- Add index for faster queries
CREATE INDEX idx_nfl_games_week ON nfl_games(week_id);
CREATE INDEX idx_nfl_games_espn_id ON nfl_games(espn_event_id);
CREATE INDEX idx_nfl_games_status ON nfl_games(game_status);

-- Add updated_at trigger
CREATE TRIGGER update_nfl_games_updated_at BEFORE UPDATE ON nfl_games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE nfl_games ENABLE ROW LEVEL SECURITY;

-- Public can view games
CREATE POLICY "Public can view games"
ON nfl_games FOR SELECT
TO anon
USING (true);

-- Service role can do everything
CREATE POLICY "Service role can do everything on games"
ON nfl_games FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a function to automatically update picks when game results change
CREATE OR REPLACE FUNCTION update_picks_from_game_result()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if game is final and we have a winner
  IF NEW.game_status = 'final' AND (NEW.home_won IS NOT NULL OR NEW.away_won IS NOT NULL) THEN
    
    -- Update picks for home team
    UPDATE picks
    SET 
      team_won = NEW.home_won,
      is_strike = NOT COALESCE(NEW.home_won, false),
      updated_at = NOW()
    WHERE 
      week_id = NEW.week_id 
      AND team_id = NEW.home_team_id
      AND team_won IS NULL; -- Only update if not already set
    
    -- Update picks for away team
    UPDATE picks
    SET 
      team_won = NEW.away_won,
      is_strike = NOT COALESCE(NEW.away_won, false),
      updated_at = NOW()
    WHERE 
      week_id = NEW.week_id 
      AND team_id = NEW.away_team_id
      AND team_won IS NULL; -- Only update if not already set
    
    -- Update player strikes based on new losses
    UPDATE players p
    SET 
      strikes = (
        SELECT COUNT(*) 
        FROM picks 
        WHERE player_id = p.id 
        AND is_strike = true
      ),
      updated_at = NOW()
    WHERE p.id IN (
      SELECT DISTINCT player_id 
      FROM picks 
      WHERE week_id = NEW.week_id 
      AND (team_id = NEW.home_team_id OR team_id = NEW.away_team_id)
    );
    
    -- Mark players as eliminated if they hit max strikes (and haven't bought back)
    UPDATE players p
    SET 
      is_eliminated = true,
      is_active = false,
      updated_at = NOW()
    WHERE 
      p.strikes >= (SELECT max_strikes FROM pool_settings WHERE season_year = EXTRACT(YEAR FROM NOW()) LIMIT 1)
      AND NOT p.has_bought_back
      AND p.id IN (
        SELECT DISTINCT player_id 
        FROM picks 
        WHERE week_id = NEW.week_id 
        AND (team_id = NEW.home_team_id OR team_id = NEW.away_team_id)
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update picks when games complete
CREATE TRIGGER trigger_update_picks_from_game
AFTER INSERT OR UPDATE ON nfl_games
FOR EACH ROW
EXECUTE FUNCTION update_picks_from_game_result();

-- Create a helpful view for game results
CREATE OR REPLACE VIEW game_results_view AS
SELECT 
  g.id,
  g.espn_event_id,
  w.week_number,
  w.season_year,
  home.team_abbreviation as home_team,
  home.team_name as home_team_name,
  away.team_abbreviation as away_team,
  away.team_name as away_team_name,
  g.home_score,
  g.away_score,
  g.home_won,
  g.away_won,
  g.game_status,
  g.game_date,
  g.updated_at
FROM nfl_games g
JOIN weeks w ON g.week_id = w.id
JOIN nfl_teams home ON g.home_team_id = home.id
JOIN nfl_teams away ON g.away_team_id = away.id
ORDER BY g.game_date DESC;

-- Grant access to the view
GRANT SELECT ON game_results_view TO anon;
GRANT ALL ON game_results_view TO service_role;
