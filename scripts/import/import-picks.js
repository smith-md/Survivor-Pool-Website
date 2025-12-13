import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapping of full team names to abbreviations
const teamNameToAbbr = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Football Team': 'WSH',  // Old name -> Washington Commanders
  'Washington Commanders': 'WSH'
};

const SEASON_YEAR = 2025;

async function importPicks(csvPath) {
  console.log('Reading CSV file...');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse without column headers first to handle duplicate column names
  const allRecords = parse(fileContent, {
    skip_empty_lines: true,
    relax_column_count: true
  });

  // Extract headers and data
  const headers = allRecords[0];
  const dataRows = allRecords.slice(1);

  // Find the column indices for the data we need
  const participantIdx = 0;
  const stillInIdx = 1;
  const lossesIdx = 2;
  const weekStartIdx = 3; // Week 1 starts at column 3 (0-indexed)
  const weekEndIdx = 20;   // Week 18 ends at column 20 (0-indexed)

  const records = dataRows.map(row => {
    const record = {
      'Participant': row[participantIdx],
      'Still in?': row[stillInIdx],
      'Losses': row[lossesIdx]
    };

    // Add week columns (only the first 18, not the CHECK columns)
    for (let i = 0; i < 18; i++) {
      const weekNum = i + 1;
      const colIdx = weekStartIdx + i;
      record[`Week ${weekNum}`] = row[colIdx] || '';
    }

    return record;
  });

  console.log(`Found ${records.length} players in CSV`);

  // Fetch all teams from database
  console.log('Fetching teams from database...');
  const { data: teams, error: teamsError } = await supabase
    .from('nfl_teams')
    .select('id, team_abbreviation, team_name');

  if (teamsError) {
    console.error('Error fetching teams:', teamsError);
    return;
  }

  const teamsByAbbr = {};
  teams.forEach(team => {
    teamsByAbbr[team.team_abbreviation] = team;
  });

  // Fetch all weeks for the season
  console.log('Fetching weeks from database...');
  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('id, week_number')
    .eq('season_year', SEASON_YEAR)
    .order('week_number');

  if (weeksError) {
    console.error('Error fetching weeks:', weeksError);
    return;
  }

  const weeksByNumber = {};
  weeks.forEach(week => {
    weeksByNumber[week.week_number] = week;
  });

  console.log(`Found ${weeks.length} weeks in database`);

  // Process each player
  let playersCreated = 0;
  let playersUpdated = 0;
  let picksInserted = 0;
  let picksSkipped = 0;

  for (const record of records) {
    const playerName = record['Participant'];
    const stillIn = record['Still in?'] === 'Y';
    const losses = parseInt(record['Losses']) || 0;

    console.log(`\nProcessing player: ${playerName}`);

    // Find or create player
    let { data: existingPlayers, error: findError } = await supabase
      .from('players')
      .select('*')
      .eq('name', playerName)
      .eq('season_year', SEASON_YEAR);

    if (findError) {
      console.error(`Error finding player ${playerName}:`, findError);
      continue;
    }

    let player;
    if (existingPlayers && existingPlayers.length > 0) {
      player = existingPlayers[0];

      // Update player status
      const { error: updateError } = await supabase
        .from('players')
        .update({
          strikes: losses,
          is_active: stillIn,
          is_eliminated: !stillIn,
          updated_at: new Date().toISOString()
        })
        .eq('id', player.id);

      if (updateError) {
        console.error(`Error updating player ${playerName}:`, updateError);
        continue;
      }
      playersUpdated++;
      console.log(`  Updated player (${losses} strikes, ${stillIn ? 'active' : 'eliminated'})`);
    } else {
      // Create new player
      const { data: newPlayer, error: createError } = await supabase
        .from('players')
        .insert({
          name: playerName,
          season_year: SEASON_YEAR,
          strikes: losses,
          is_active: stillIn,
          is_eliminated: !stillIn,
          entry_fee_paid: true
        })
        .select()
        .single();

      if (createError) {
        console.error(`Error creating player ${playerName}:`, createError);
        continue;
      }
      player = newPlayer;
      playersCreated++;
      console.log(`  Created new player`);
    }

    // Process picks for each week
    for (let weekNum = 1; weekNum <= 18; weekNum++) {
      const columnName = `Week ${weekNum}`;
      const teamName = record[columnName];

      if (!teamName || teamName.trim() === '') {
        continue; // No pick for this week
      }

      const teamAbbr = teamNameToAbbr[teamName];
      if (!teamAbbr) {
        console.warn(`  Unknown team name: "${teamName}" in ${columnName}`);
        continue;
      }

      const team = teamsByAbbr[teamAbbr];
      if (!team) {
        console.warn(`  Team abbreviation not found in database: ${teamAbbr}`);
        continue;
      }

      const week = weeksByNumber[weekNum];
      if (!week) {
        console.warn(`  Week ${weekNum} not found in database`);
        continue;
      }

      // Check if pick already exists
      const { data: existingPicks, error: pickCheckError } = await supabase
        .from('picks')
        .select('id')
        .eq('player_id', player.id)
        .eq('week_id', week.id);

      if (pickCheckError) {
        console.error(`  Error checking existing pick:`, pickCheckError);
        continue;
      }

      if (existingPicks && existingPicks.length > 0) {
        picksSkipped++;
        continue; // Pick already exists
      }

      // Insert pick
      const { error: insertError } = await supabase
        .from('picks')
        .insert({
          player_id: player.id,
          week_id: week.id,
          team_id: team.id
        });

      if (insertError) {
        console.error(`  Error inserting pick for ${columnName}:`, insertError);
        continue;
      }

      picksInserted++;
      console.log(`  Inserted pick: ${columnName} -> ${teamAbbr}`);
    }
  }

  console.log('\n========== IMPORT SUMMARY ==========');
  console.log(`Players created: ${playersCreated}`);
  console.log(`Players updated: ${playersUpdated}`);
  console.log(`Picks inserted: ${picksInserted}`);
  console.log(`Picks skipped (already exist): ${picksSkipped}`);
  console.log('====================================\n');
}

// Run the import
const csvPath = process.argv[2] || 'C:\\Users\\smith\\Downloads\\Survivor League Football 2025 - Picks.csv';
importPicks(csvPath).catch(console.error);
