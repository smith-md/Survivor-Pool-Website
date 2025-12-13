const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const CSV_PATH = 'C:\\Users\\smith\\Downloads\\Survivor League Football 2025 - Picks.csv';
const currentYear = 2025;

async function fixAndReloadPicks() {
  console.log('📄 Reading CSV file...\n');

  // Read the CSV file
  let csvContent = fs.readFileSync(CSV_PATH, 'utf-8');

  // Count occurrences before replacement
  const beforeCount = (csvContent.match(/Washington Football Team/g) || []).length;
  console.log(`Found ${beforeCount} instance(s) of "Washington Football Team"\n`);

  if (beforeCount > 0) {
    // Replace all occurrences
    csvContent = csvContent.replace(/Washington Football Team/g, 'Washington Commanders');

    // Verify replacement
    const afterCount = (csvContent.match(/Washington Football Team/g) || []).length;
    const commandersCount = (csvContent.match(/Washington Commanders/g) || []).length;

    console.log(`✓ Replaced all occurrences`);
    console.log(`✓ Now have ${commandersCount} instance(s) of "Washington Commanders"\n`);

    // Save the fixed CSV
    const backupPath = CSV_PATH.replace('.csv', '_backup.csv');
    fs.writeFileSync(backupPath, fs.readFileSync(CSV_PATH));
    console.log(`💾 Created backup at: ${backupPath}`);

    fs.writeFileSync(CSV_PATH, csvContent);
    console.log(`✓ Updated original file: ${CSV_PATH}\n`);
  } else {
    console.log('✅ No "Washington Football Team" found - CSV is already correct!\n');
  }

  console.log('🔄 Now reloading data to Supabase...\n');

  // Remove the CHECK column and everything after it (the duplicate Week columns with 0s and 1s)
  console.log('Cleaning CSV to remove CHECK columns...');
  const lines = csvContent.split('\n');
  const cleanedLines = lines.map(line => {
    // Split by comma, find the CHECK column, and keep everything before it
    const cols = line.split(',');
    const checkIndex = cols.indexOf('CHECK');
    if (checkIndex !== -1) {
      // Keep only columns before CHECK
      return cols.slice(0, checkIndex - 1).join(','); // -1 to also remove the empty column before CHECK
    }
    // For data rows, keep first 21 columns (Participant + Still in + Losses + 18 weeks)
    if (cols.length > 21) {
      return cols.slice(0, 21).join(',');
    }
    return line;
  });
  const cleanedCsv = cleanedLines.join('\n');
  console.log('✓ Cleaned CSV\n');

  // Parse the CSV
  const records = parse(cleanedCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  console.log(`Found ${records.length} player records\n`);

  // Fetch necessary data from Supabase
  console.log('📊 Fetching teams, players, and weeks from Supabase...');

  const [{ data: teams }, { data: weeks }, { data: players }] = await Promise.all([
    supabase.from('nfl_teams').select('*'),
    supabase.from('weeks').select('*').eq('season_year', currentYear).order('week_number'),
    supabase.from('players').select('*').eq('season_year', currentYear)
  ]);

  console.log(`✓ Found ${teams.length} teams`);
  console.log(`✓ Found ${weeks.length} weeks`);
  console.log(`✓ Found ${players.length} players\n`);

  // Delete all existing picks for current season
  console.log('🗑️  Clearing existing picks...');
  const playerIds = players.map(p => p.id);
  if (playerIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('picks')
      .delete()
      .in('player_id', playerIds);

    if (deleteError) {
      console.error('Error deleting picks:', deleteError);
    } else {
      console.log('✓ Cleared existing picks\n');
    }
  }

  // Process each player's picks
  let picksCreated = 0;
  let errors = 0;

  for (const record of records) {
    const playerName = record['Participant'];
    if (!playerName) continue;

    // Find the player
    const player = players.find(p =>
      p.name.toLowerCase() === playerName.toLowerCase() ||
      `${p.first_name} ${p.last_name}`.toLowerCase() === playerName.toLowerCase()
    );

    if (!player) {
      console.log(`⚠️  Player not found: ${playerName}`);
      errors++;
      continue;
    }

    // Process each week
    for (let i = 1; i <= 18; i++) {
      const weekCol = `Week ${i}`;
      const teamName = record[weekCol];

      if (!teamName || teamName.trim() === '') continue;

      // Find the week
      const week = weeks.find(w => w.week_number === i);
      if (!week) {
        console.log(`⚠️  Week ${i} not found`);
        continue;
      }

      // Find the team
      const team = teams.find(t =>
        t.team_name.toLowerCase() === teamName.toLowerCase()
      );

      if (!team) {
        console.log(`⚠️  Team not found: "${teamName}" for ${playerName} in Week ${i}`);
        errors++;
        continue;
      }

      // Insert the pick
      const { error } = await supabase
        .from('picks')
        .insert([{
          player_id: player.id,
          week_id: week.id,
          team_id: team.id
        }]);

      if (error) {
        if (error.code === '23505') { // Duplicate key error
          console.log(`⚠️  ${playerName} already used ${team.team_abbreviation}`);
        } else {
          console.log(`❌ Error inserting pick for ${playerName}, Week ${i}:`, error.message);
        }
        errors++;
      } else {
        picksCreated++;
      }
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Created: ${picksCreated} picks`);
  console.log(`   Errors: ${errors}\n`);
}

fixAndReloadPicks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
