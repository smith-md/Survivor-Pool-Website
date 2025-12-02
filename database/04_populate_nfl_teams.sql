-- Populate NFL Teams
-- All 32 teams with their abbreviations, full names, conference, and division

INSERT INTO nfl_teams (abbreviation, full_name, conference, division) VALUES
-- AFC East
('BUF', 'Buffalo Bills', 'AFC', 'East'),
('MIA', 'Miami Dolphins', 'AFC', 'East'),
('NE', 'New England Patriots', 'AFC', 'East'),
('NYJ', 'New York Jets', 'AFC', 'East'),

-- AFC North
('BAL', 'Baltimore Ravens', 'AFC', 'North'),
('CIN', 'Cincinnati Bengals', 'AFC', 'North'),
('CLE', 'Cleveland Browns', 'AFC', 'North'),
('PIT', 'Pittsburgh Steelers', 'AFC', 'North'),

-- AFC South
('HOU', 'Houston Texans', 'AFC', 'South'),
('IND', 'Indianapolis Colts', 'AFC', 'South'),
('JAX', 'Jacksonville Jaguars', 'AFC', 'South'),
('TEN', 'Tennessee Titans', 'AFC', 'South'),

-- AFC West
('DEN', 'Denver Broncos', 'AFC', 'West'),
('KC', 'Kansas City Chiefs', 'AFC', 'West'),
('LV', 'Las Vegas Raiders', 'AFC', 'West'),
('LAC', 'Los Angeles Chargers', 'AFC', 'West'),

-- NFC East
('DAL', 'Dallas Cowboys', 'NFC', 'East'),
('NYG', 'New York Giants', 'NFC', 'East'),
('PHI', 'Philadelphia Eagles', 'NFC', 'East'),
('WSH', 'Washington Commanders', 'NFC', 'East'),

-- NFC North
('CHI', 'Chicago Bears', 'NFC', 'North'),
('DET', 'Detroit Lions', 'NFC', 'North'),
('GB', 'Green Bay Packers', 'NFC', 'North'),
('MIN', 'Minnesota Vikings', 'NFC', 'North'),

-- NFC South
('ATL', 'Atlanta Falcons', 'NFC', 'South'),
('CAR', 'Carolina Panthers', 'NFC', 'South'),
('NO', 'New Orleans Saints', 'NFC', 'South'),
('TB', 'Tampa Bay Buccaneers', 'NFC', 'South'),

-- NFC West
('ARI', 'Arizona Cardinals', 'NFC', 'West'),
('LAR', 'Los Angeles Rams', 'NFC', 'West'),
('SF', 'San Francisco 49ers', 'NFC', 'West'),
('SEA', 'Seattle Seahawks', 'NFC', 'West')

ON CONFLICT (abbreviation) DO NOTHING;

-- Verify the data
SELECT conference, division, COUNT(*) as team_count 
FROM nfl_teams 
GROUP BY conference, division 
ORDER BY conference, division;
