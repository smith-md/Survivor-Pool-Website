-- Fix elimination trigger to handle buyback pending status
-- Players with 2 strikes should NOT be auto-eliminated
-- Only eliminate players with 3+ strikes

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

    -- Mark players as eliminated ONLY if they have 3+ strikes
    -- Players with exactly 2 strikes are in "buyback pending" status
    -- Admin will manually set elimination when buyback decision is made
    UPDATE players p
    SET
      is_eliminated = true,
      is_active = false,
      updated_at = NOW()
    WHERE
      p.strikes >= 3  -- Changed from >= max_strikes to >= 3 (hardcoded for 2-loss pool)
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

-- Trigger remains the same, just the function is updated
-- No need to recreate the trigger
