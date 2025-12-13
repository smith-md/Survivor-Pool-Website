const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkFinalGames() {
  console.log('🔍 Checking completed games...\n');

  const { data: games, error } = await supabase
    .from('nfl_games')
    .select(`
      *,
      home_team:nfl_teams!home_team_id(team_abbreviation),
      away_team:nfl_teams!away_team_id(team_abbreviation),
      week:weeks(week_number)
    `)
    .eq('game_status', 'final');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Total completed games: ${games.length}\n`);

  // Find all teams that lost
  const losses = [];
  games.forEach(game => {
    if (!game.home_won) {
      losses.push({
        team: game.home_team.team_abbreviation,
        week: game.week.week_number,
        score: `${game.home_score}-${game.away_score}`,
        opponent: game.away_team.team_abbreviation
      });
    }
    if (!game.away_won) {
      losses.push({
        team: game.away_team.team_abbreviation,
        week: game.week.week_number,
        score: `${game.away_score}-${game.home_score}`,
        opponent: game.home_team.team_abbreviation
      });
    }
  });

  console.log(`Teams that lost (${losses.length} total):\n`);
  losses.slice(0, 30).forEach(l => {
    console.log(`  Week ${l.week}: ${l.team} lost ${l.score} to ${l.opponent}`);
  });

  if (losses.length > 30) {
    console.log(`  ... and ${losses.length - 30} more\n`);
  }
}

checkFinalGames().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
