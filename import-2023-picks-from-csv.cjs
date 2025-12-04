const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Map full team names to abbreviations
const TEAM_NAME_MAP = {
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
  'Washington Football Team': 'WSH', // 2023 name
  'Washington Commanders': 'WSH'
};

async function import2023Picks() {
  console.log('📊 Importing 2023 Picks from CSV...\n');

  // Read CSV file
  const csvPath = 'C:\\Users\\smith\\Downloads\\Survivor League Football 2023 - Picks.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  // Get weeks and teams from database
  const { data: weeks } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_year', 2023)
    .order('week_number');

  const { data: teams } = await supabase
    .from('nfl_teams')
    .select('*');

  const teamIdMap = {};
  teams.forEach(team => {
    teamIdMap[team.team_abbreviation] = team.id;
  });

  console.log(`Found ${weeks.length} weeks and ${teams.length} teams\n`);

  let playersAdded = 0;
  let picksAdded = 0;

  // Parse CSV (skip header row)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = parseCSVLine(line);

    // Column indices based on CSV structure
    const rebuy = cells[1] === 'Y';
    const playerName = cells[3];
    const losses = parseInt(cells[4]) || 0;

    if (!playerName) continue;

    console.log(`\n👤 Processing ${playerName}...`);

    // Split name into first and last
    const nameParts = playerName.split(' ');
    let firstName, lastName;

    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = '';
    } else {
      firstName = nameParts.slice(0, -1).join(' ');
      lastName = nameParts[nameParts.length - 1];
    }

    // Create player
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        season_year: 2023,
        name: playerName,
        first_name: firstName,
        last_name: lastName,
        entry_fee_paid: true,
        strikes: losses,
        is_active: losses < 2,
        is_eliminated: losses >= 2,
        has_bought_back: rebuy
      })
      .select();

    if (playerError) {
      console.error(`  ❌ Error adding player: ${playerError.message}`);
      continue;
    }

    const playerId = playerData[0].id;
    console.log(`  ✅ Added player (${losses} strikes, ${rebuy ? 'bought back' : 'no rebuy'})`);
    playersAdded++;

    // Process picks for weeks 1-18 (columns 5-22)
    for (let weekNum = 1; weekNum <= 18; weekNum++) {
      const pickColumn = 4 + weekNum; // Week 1 is column 5 (index 5)
      const resultColumn = 24 + weekNum; // Week 1 result is column 25 (index 25)

      const teamName = cells[pickColumn]?.trim();
      const result = cells[resultColumn]?.trim();

      if (!teamName) continue; // No pick for this week

      // Map team name to abbreviation
      const teamAbbr = TEAM_NAME_MAP[teamName];
      if (!teamAbbr) {
        console.log(`  ⚠️  Week ${weekNum}: Unknown team "${teamName}"`);
        continue;
      }

      const teamId = teamIdMap[teamAbbr];
      if (!teamId) {
        console.log(`  ⚠️  Week ${weekNum}: Team abbreviation "${teamAbbr}" not found in database`);
        continue;
      }

      const week = weeks.find(w => w.week_number === weekNum);
      if (!week) {
        console.log(`  ⚠️  Week ${weekNum}: Week not found in database`);
        continue;
      }

      // Determine if this was a win or loss
      const teamWon = result === '0'; // 0 = win, 1 = loss in CSV
      const isStrike = result === '1';

      const { error: pickError } = await supabase
        .from('picks')
        .insert({
          player_id: playerId,
          week_id: week.id,
          team_id: teamId,
          team_won: teamWon,
          is_strike: isStrike
        });

      if (pickError) {
        console.log(`  ❌ Week ${weekNum}: ${pickError.message}`);
      } else {
        const status = teamWon ? '✅ WIN' : '❌ LOSS';
        console.log(`  Week ${weekNum}: ${teamAbbr} ${status}`);
        picksAdded++;
      }
    }
  }

  console.log(`\n\n🎉 Import Complete!`);
  console.log(`  Players added: ${playersAdded}`);
  console.log(`  Picks added: ${picksAdded}`);
  console.log(`\n📺 Visit http://localhost:5173/archive to see the 2023 season!`);
}

// Helper function to properly parse CSV line (handles commas in quotes)
function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);

  return cells;
}

import2023Picks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
