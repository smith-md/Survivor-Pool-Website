const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkLosses() {
  console.log('🔍 Checking for picks with losses...\n');

  const { data: picks, error } = await supabase
    .from('picks')
    .select(`
      id,
      team_won,
      is_strike,
      player:players(first_name, last_name),
      team:nfl_teams(team_abbreviation),
      week:weeks(week_number)
    `)
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('Sample picks:');
  picks.forEach(pick => {
    console.log(`  Player: ${pick.player?.first_name} ${pick.player?.last_name}`);
    console.log(`  Team: ${pick.team?.team_abbreviation}`);
    console.log(`  Week: ${pick.week?.week_number}`);
    console.log(`  team_won: ${pick.team_won}`);
    console.log(`  is_strike: ${pick.is_strike}`);
    console.log('');
  });

  // Count picks by status
  const { data: allPicks } = await supabase
    .from('picks')
    .select('team_won, is_strike');

  const wins = allPicks?.filter(p => p.team_won === true).length || 0;
  const losses = allPicks?.filter(p => p.team_won === false).length || 0;
  const noResult = allPicks?.filter(p => p.team_won === null).length || 0;
  const strikes = allPicks?.filter(p => p.is_strike === true).length || 0;

  console.log('\n📊 Summary:');
  console.log(`  Total picks: ${allPicks?.length || 0}`);
  console.log(`  Wins (team_won = true): ${wins}`);
  console.log(`  Losses (team_won = false): ${losses}`);
  console.log(`  No result yet (team_won = null): ${noResult}`);
  console.log(`  Strikes (is_strike = true): ${strikes}`);
}

checkLosses().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
