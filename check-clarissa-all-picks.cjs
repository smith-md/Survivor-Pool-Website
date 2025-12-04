const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkClarissaPicks() {
  console.log('🔍 Checking ALL of Clarissa\'s picks...\n');

  // Find Clarissa
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .or('first_name.ilike.%Clarissa%,last_name.ilike.%Clarissa%,name.ilike.%Clarissa%');

  if (!players || players.length === 0) {
    console.log('❌ Clarissa not found!');
    return;
  }

  const clarissa = players[0];
  console.log(`Player: ${clarissa.first_name || clarissa.name}\n`);

  // Get ALL picks
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      week:weeks(week_number),
      team:nfl_teams(team_abbreviation, team_name)
    `)
    .eq('player_id', clarissa.id)
    .order('week_id', { ascending: true });

  console.log(`Total picks: ${picks.length}\n`);
  console.log('Week-by-week breakdown:');
  picks.forEach(pick => {
    const status = pick.team_won === null ? '⚪ PENDING' : pick.team_won ? '✅ WIN' : '❌ LOSS';
    console.log(`Week ${String(pick.week.week_number).padStart(2, ' ')}: ${pick.team.team_abbreviation.padEnd(4, ' ')} - ${status} - ${pick.team.team_name}`);
  });

  // Check all games in nfl_games
  console.log('\n\n🏈 Checking nfl_games table...');
  const { data: games } = await supabase
    .from('nfl_games')
    .select(`
      *,
      week:weeks(week_number),
      home_team:nfl_teams!home_team_id(team_abbreviation),
      away_team:nfl_teams!away_team_id(team_abbreviation)
    `)
    .order('week_id', { ascending: true });

  console.log(`\nTotal games in database: ${games ? games.length : 0}`);

  if (games && games.length > 0) {
    console.log('\nGames by week:');
    const gamesByWeek = {};
    games.forEach(game => {
      const week = game.week.week_number;
      if (!gamesByWeek[week]) gamesByWeek[week] = [];
      gamesByWeek[week].push(`${game.away_team.team_abbreviation}@${game.home_team.team_abbreviation} (${game.game_status})`);
    });

    Object.keys(gamesByWeek).sort((a, b) => Number(a) - Number(b)).forEach(week => {
      console.log(`\nWeek ${week}: ${gamesByWeek[week].length} games`);
      gamesByWeek[week].forEach(g => console.log(`  ${g}`));
    });
  }
}

checkClarissaPicks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
