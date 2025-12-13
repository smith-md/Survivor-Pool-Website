const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkGameResults() {
  console.log('🔍 Checking for game results data...\n');

  // Try to find a games table
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .limit(5);

  if (!gamesError) {
    console.log('✅ Found games table!');
    console.log('Sample games:');
    console.log(JSON.stringify(games, null, 2));
  } else {
    console.log('❌ No games table found:', gamesError.message);
  }

  // Check if there's a nfl_games table
  const { data: nflGames, error: nflGamesError } = await supabase
    .from('nfl_games')
    .select('*')
    .limit(5);

  if (!nflGamesError) {
    console.log('\n✅ Found nfl_games table!');
    console.log('Sample nfl_games:');
    console.log(JSON.stringify(nflGames, null, 2));
  } else {
    console.log('\n❌ No nfl_games table found:', nflGamesError.message);
  }

  // Check if teams have a win/loss record field
  const { data: teams, error: teamsError } = await supabase
    .from('nfl_teams')
    .select('*')
    .limit(1);

  if (!teamsError && teams.length > 0) {
    console.log('\n📋 NFL Teams table structure:');
    console.log(JSON.stringify(teams[0], null, 2));
  }

  // Check if weeks have game results
  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('*')
    .limit(1);

  if (!weeksError && weeks.length > 0) {
    console.log('\n📋 Weeks table structure:');
    console.log(JSON.stringify(weeks[0], null, 2));
  }
}

checkGameResults().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
