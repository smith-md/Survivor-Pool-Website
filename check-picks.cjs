const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkPicks() {
  console.log('🔍 Checking picks data...\n');

  // Check total picks count
  const { data: allPicks, error: picksError, count } = await supabase
    .from('picks')
    .select('*', { count: 'exact' });

  if (picksError) {
    console.error('❌ Error fetching picks:', picksError);
    return;
  }

  console.log(`Total picks in database: ${count}\n`);

  // Check a sample pick with joined data (like Home.jsx does)
  const { data: joinedPicks, error: joinError } = await supabase
    .from('picks')
    .select(`
      *,
      week:weeks!inner(week_number, season_year),
      team:nfl_teams(team_abbreviation, team_name),
      player:players(first_name, last_name, name)
    `)
    .limit(5);

  if (joinError) {
    console.error('❌ Error with joined query:', joinError);
    return;
  }

  console.log(`Joined query returned: ${joinedPicks?.length || 0} picks\n`);

  if (joinedPicks && joinedPicks.length > 0) {
    console.log('Sample picks:');
    joinedPicks.forEach(pick => {
      console.log(`  - ${pick.player?.first_name || pick.player?.name} ${pick.player?.last_name || ''}: Week ${pick.week?.week_number} = ${pick.team?.team_abbreviation}`);
    });
  } else {
    console.log('⚠️  No picks returned from joined query!\n');

    // Let's check if there are orphaned picks
    console.log('Checking for potential issues...\n');

    const { data: picksWithIssues } = await supabase
      .from('picks')
      .select('id, player_id, week_id, team_id')
      .limit(10);

    console.log('Sample raw picks (first 10):');
    for (const pick of picksWithIssues || []) {
      console.log(`  Pick ID: ${pick.id}`);
      console.log(`    player_id: ${pick.player_id}`);
      console.log(`    week_id: ${pick.week_id}`);
      console.log(`    team_id: ${pick.team_id}`);

      // Check if related records exist
      const { data: player } = await supabase
        .from('players')
        .select('id, first_name, last_name, name, season_year')
        .eq('id', pick.player_id)
        .single();

      const { data: week } = await supabase
        .from('weeks')
        .select('id, week_number, season_year')
        .eq('id', pick.week_id)
        .single();

      const { data: team } = await supabase
        .from('nfl_teams')
        .select('id, team_abbreviation')
        .eq('id', pick.team_id)
        .single();

      console.log(`    Player exists: ${player ? `Yes (${player.first_name || player.name} - ${player.season_year})` : 'NO!'}`);
      console.log(`    Week exists: ${week ? `Yes (Week ${week.week_number} - ${week.season_year})` : 'NO!'}`);
      console.log(`    Team exists: ${team ? `Yes (${team.team_abbreviation})` : 'NO!'}`);
      console.log('');
    }
  }
}

checkPicks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
