-- Migration: Add first_name and last_name columns to players table
-- This keeps the original 'name' column for now

-- Add new columns
ALTER TABLE players
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_players_first_name ON players(first_name);
CREATE INDEX IF NOT EXISTS idx_players_last_name ON players(last_name);

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'players'
AND column_name IN ('name', 'first_name', 'last_name')
ORDER BY ordinal_position;
