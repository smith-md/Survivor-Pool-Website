const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingResults() {
  console.log('🔍 Checking picks without results...\n');

  // Get all picks without results
  const { data: picksWithoutResults, error } = await supabase
    .from('picks')
    .select(`
      id,
      team_id,
      week_id,
      team_won,
      player:players(first_name, last_name, name),
      team:nfl_teams(team_abbreviation),
      week:weeks(week_number)
    `)
    .is('team_won', null);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${picksWithoutResults.length} picks without results\n`);

  // Group by week
  const byWeek = {};
  picksWithoutResults.forEach(pick => {
    const weekNum = pick.week?.week_number;
    if (!byWeek[weekNum]) {
      byWeek[weekNum] = [];
    }
    byWeek[weekNum].push(pick);
  });

  // Show picks by week
  Object.keys(byWeek).sort((a, b) => a - b).forEach(weekNum => {
    console.log(`\n📅 Week ${weekNum} (${byWeek[weekNum].length} picks):`);

    // Check if there are games for this week
    const weekId = byWeek[weekNum][0].week_id;

    supabase
      .from('nfl_games')
      .select('id, game_status')
      .eq('week_id', weekId)
      .then(({ data: games }) => {
        const finalGames = games?.filter(g => g.game_status === 'final').length || 0;
        const totalGames = games?.length || 0;
        console.log(`  Games in database: ${totalGames} total, ${finalGames} final`);

        // Show sample picks
        byWeek[weekNum].slice(0, 5).forEach(pick => {
          const playerName = `${pick.player?.first_name || pick.player?.name || ''} ${pick.player?.last_name || ''}`.trim();
          console.log(`    - ${playerName}: ${pick.team?.team_abbreviation}`);
        });

        if (byWeek[weekNum].length > 5) {
          console.log(`    ... and ${byWeek[weekNum].length - 5} more`);
        }
      });
  });

  // Wait for all async operations to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
}

checkMissingResults().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
