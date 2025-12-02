-- Sample Test Data for NFL Survivor Pool
-- Run this in Supabase SQL Editor to populate your database with test data

-- Add some test players
INSERT INTO players (name, email, strikes, entry_fee_paid, is_active) VALUES
('Alice Johnson', 'alice@example.com', 0, true, true),
('Bob Smith', 'bob@example.com', 1, true, true),
('Charlie Brown', 'charlie@example.com', 2, true, true),
('Diana Prince', 'diana@example.com', 0, true, true),
('Eve Davis', 'eve@example.com', 1, true, true),
('Frank Miller', 'frank@example.com', 3, true, false);

-- Add pool settings for current season
INSERT INTO pool_settings (season_year, entry_fee, buyback_fee, total_pot, max_strikes)
VALUES (2025, 50.00, 25.00, 300.00, 2);

-- Add some weeks for the 2025 season
INSERT INTO weeks (week_number, season_year, start_date, end_date, is_complete) VALUES
(1, 2025, '2025-09-04', '2025-09-10', true),
(2, 2025, '2025-09-11', '2025-09-17', true),
(3, 2025, '2025-09-18', '2025-09-24', false),
(4, 2025, '2025-09-25', '2025-10-01', false);

-- Now we need to add some picks
-- First, let's get the IDs we'll need (run this to see the IDs)
-- SELECT id, name FROM players ORDER BY name;
-- SELECT id, week_number FROM weeks ORDER BY week_number;
-- SELECT id, team_abbreviation FROM nfl_teams ORDER BY team_abbreviation;

-- For this example, I'll use a query to insert picks automatically
-- Week 1 Picks (all won except Charlie's)
DO $$
DECLARE
    week1_id UUID;
    alice_id UUID;
    bob_id UUID;
    charlie_id UUID;
    diana_id UUID;
    eve_id UUID;
    kc_id UUID;
    buf_id UUID;
    sf_id UUID;
    dal_id UUID;
    det_id UUID;
BEGIN
    -- Get IDs
    SELECT id INTO week1_id FROM weeks WHERE week_number = 1 AND season_year = 2025;
    SELECT id INTO alice_id FROM players WHERE name = 'Alice Johnson';
    SELECT id INTO bob_id FROM players WHERE name = 'Bob Smith';
    SELECT id INTO charlie_id FROM players WHERE name = 'Charlie Brown';
    SELECT id INTO diana_id FROM players WHERE name = 'Diana Prince';
    SELECT id INTO eve_id FROM players WHERE name = 'Eve Davis';
    
    SELECT id INTO kc_id FROM nfl_teams WHERE team_abbreviation = 'KC';
    SELECT id INTO buf_id FROM nfl_teams WHERE team_abbreviation = 'BUF';
    SELECT id INTO sf_id FROM nfl_teams WHERE team_abbreviation = 'SF';
    SELECT id INTO dal_id FROM nfl_teams WHERE team_abbreviation = 'DAL';
    SELECT id INTO det_id FROM nfl_teams WHERE team_abbreviation = 'DET';
    
    -- Insert Week 1 picks
    INSERT INTO picks (player_id, week_id, team_id, team_won, is_strike) VALUES
    (alice_id, week1_id, kc_id, true, false),
    (bob_id, week1_id, buf_id, true, false),
    (charlie_id, week1_id, sf_id, false, true),  -- Lost!
    (diana_id, week1_id, dal_id, true, false),
    (eve_id, week1_id, det_id, true, false);
END $$;

-- Week 2 Picks (Bob and Charlie both lost)
DO $$
DECLARE
    week2_id UUID;
    alice_id UUID;
    bob_id UUID;
    charlie_id UUID;
    diana_id UUID;
    eve_id UUID;
    phi_id UUID;
    bal_id UUID;
    ne_id UUID;
    gb_id UUID;
    mia_id UUID;
BEGIN
    SELECT id INTO week2_id FROM weeks WHERE week_number = 2 AND season_year = 2025;
    SELECT id INTO alice_id FROM players WHERE name = 'Alice Johnson';
    SELECT id INTO bob_id FROM players WHERE name = 'Bob Smith';
    SELECT id INTO charlie_id FROM players WHERE name = 'Charlie Brown';
    SELECT id INTO diana_id FROM players WHERE name = 'Diana Prince';
    SELECT id INTO eve_id FROM players WHERE name = 'Eve Davis';
    
    SELECT id INTO phi_id FROM nfl_teams WHERE team_abbreviation = 'PHI';
    SELECT id INTO bal_id FROM nfl_teams WHERE team_abbreviation = 'BAL';
    SELECT id INTO ne_id FROM nfl_teams WHERE team_abbreviation = 'NE';
    SELECT id INTO gb_id FROM nfl_teams WHERE team_abbreviation = 'GB';
    SELECT id INTO mia_id FROM nfl_teams WHERE team_abbreviation = 'MIA';
    
    INSERT INTO picks (player_id, week_id, team_id, team_won, is_strike) VALUES
    (alice_id, week2_id, phi_id, true, false),
    (bob_id, week2_id, bal_id, false, true),  -- Lost! (2nd strike)
    (charlie_id, week2_id, ne_id, false, true),  -- Lost! (3rd strike - eliminated)
    (diana_id, week2_id, gb_id, true, false),
    (eve_id, week2_id, mia_id, true, false);
    
    -- Update player statuses based on strikes
    UPDATE players SET strikes = 1 WHERE name = 'Bob Smith';
    UPDATE players SET strikes = 2 WHERE name = 'Charlie Brown';
END $$;

-- Mark Charlie as eliminated (3 strikes)
UPDATE players SET is_eliminated = true, is_active = false WHERE name = 'Charlie Brown';

-- Update Frank as eliminated too (for variety)
UPDATE players SET is_eliminated = true, is_active = false, strikes = 3 WHERE name = 'Frank Miller';

-- Verify the data
SELECT 'Players:' as table_name;
SELECT name, strikes, is_active, is_eliminated, entry_fee_paid FROM players ORDER BY strikes, name;

SELECT 'Weeks:' as table_name;
SELECT week_number, season_year, is_complete FROM weeks ORDER BY week_number;

SELECT 'Sample Picks:' as table_name;
SELECT 
    p.name as player,
    w.week_number,
    t.team_abbreviation as team,
    pi.team_won,
    pi.is_strike
FROM picks pi
JOIN players p ON pi.player_id = p.id
JOIN weeks w ON pi.week_id = w.id
JOIN nfl_teams t ON pi.team_id = t.id
ORDER BY w.week_number, p.name;
