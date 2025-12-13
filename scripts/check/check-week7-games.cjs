const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkWeek7Games() {
  // Get Week 7 ID
  const { data: week } = await supabase
    .from('weeks')
    .select('id')
    .eq('week_number', 7)
    .eq('season_year', 2025)
    .single();

  // Get all Week 7 games
  const { data: games } = await supabase
    .from('nfl_games')
    .select(`
      *,
      home_team:nfl_teams!nfl_games_home_team_id_fkey(team_abbreviation),
      away_team:nfl_teams!nfl_games_away_team_id_fkey(team_abbreviation)
    `)
    .eq('week_id', week.id)
    .order('game_date');

  console.log(`Total Week 7 games in database: ${games.length}\n`);

  const teams = new Set();
  games.forEach(g => {
    console.log(`${g.away_team.team_abbreviation} @ ${g.home_team.team_abbreviation} - ${g.game_status} (${g.away_score}-${g.home_score})`);
    teams.add(g.home_team.team_abbreviation);
    teams.add(g.away_team.team_abbreviation);
  });

  console.log(`\nTotal teams that played in Week 7: ${teams.size}`);
  console.log(`Teams: ${Array.from(teams).sort().join(', ')}`);

  // Check if SF is in there
  if (!teams.has('SF')) {
    console.log('\n❌ SF (San Francisco 49ers) did NOT play in Week 7 according to database');
  } else {
    console.log('\n✅ SF (San Francisco 49ers) played in Week 7');
  }
}

checkWeek7Games();
