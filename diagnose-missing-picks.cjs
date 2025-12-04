const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseMissingPicks() {
  console.log('Diagnosing why picks are not matching to games...\n');

  // Get first 5 picks without results
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      id,
      team_id,
      week_id,
      team_won,
      player:players(first_name, last_name),
      team:nfl_teams(team_abbreviation),
      week:weeks(week_number)
    `)
    .is('team_won', null)
    .limit(5);

  for (const pick of picks) {
    const playerName = `${pick.player?.first_name || ''} ${pick.player?.last_name || ''}`.trim();
    console.log(`\n${playerName} - Week ${pick.week?.week_number} - ${pick.team?.team_abbreviation}`);
    console.log(`   Pick ID: ${pick.id}`);
    console.log(`   Team ID: ${pick.team_id}`);
    console.log(`   Week ID: ${pick.week_id}`);

    // Try to find the game manually
    const { data: games, error } = await supabase
      .from('nfl_games')
      .select(`
        *,
        home_team:nfl_teams!home_team_id(team_abbreviation),
        away_team:nfl_teams!away_team_id(team_abbreviation)
      `)
      .eq('week_id', pick.week_id);

    if (error) {
      console.log(`   Error querying games:`, error.message);
      continue;
    }

    console.log(`   Total games in week: ${games?.length || 0}`);

    // Find games where this team played
    const teamGames = games?.filter(g =>
      g.home_team_id === pick.team_id || g.away_team_id === pick.team_id
    );

    console.log(`   Games with ${pick.team?.team_abbreviation}: ${teamGames?.length || 0}`);

    if (teamGames && teamGames.length > 0) {
      teamGames.forEach(game => {
        console.log(`     - ${game.home_team.team_abbreviation} ${game.home_score} vs ${game.away_team.team_abbreviation} ${game.away_score} (${game.game_status})`);
        console.log(`       home_won: ${game.home_won}, away_won: ${game.away_won}`);
      });
    } else {
      console.log(`   NO GAME FOUND for ${pick.team?.team_abbreviation} in Week ${pick.week?.week_number}!`);
      console.log(`   All games in this week:`);
      games?.slice(0, 3).forEach(game => {
        console.log(`     - ${game.home_team.team_abbreviation} vs ${game.away_team.team_abbreviation}`);
      });
    }
  }
}

diagnoseMissingPicks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
