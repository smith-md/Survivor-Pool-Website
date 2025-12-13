const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkDenverWeek13() {
  console.log('🔍 Checking Denver\'s Week 13 game...\n');

  // Find Denver
  const { data: denverTeam } = await supabase
    .from('nfl_teams')
    .select('*')
    .eq('team_abbreviation', 'DEN')
    .single();

  console.log(`Team: ${denverTeam.team_name} (${denverTeam.team_abbreviation})\n`);

  // Find Week 13
  const { data: week13 } = await supabase
    .from('weeks')
    .select('*')
    .eq('week_number', 13)
    .eq('season_year', 2025)
    .single();

  console.log(`Week 13 ID: ${week13.id}`);
  console.log(`Dates: ${week13.start_date} to ${week13.end_date}\n`);

  // Find ALL Week 13 games
  const { data: allWeek13Games } = await supabase
    .from('nfl_games')
    .select(`
      *,
      home_team:nfl_teams!home_team_id(team_abbreviation, team_name),
      away_team:nfl_teams!away_team_id(team_abbreviation, team_name)
    `)
    .eq('week_id', week13.id);

  console.log(`Total Week 13 games in database: ${allWeek13Games.length}\n`);

  // Find Denver's game in Week 13
  const denverGame = allWeek13Games.find(game =>
    game.home_team_id === denverTeam.id || game.away_team_id === denverTeam.id
  );

  if (denverGame) {
    console.log('✅ Found Denver\'s Week 13 game:');
    console.log(`Matchup: ${denverGame.away_team.team_abbreviation} @ ${denverGame.home_team.team_abbreviation}`);
    console.log(`Score: ${denverGame.away_score}-${denverGame.home_score}`);
    console.log(`Status: ${denverGame.game_status}`);
    console.log(`Home Won: ${denverGame.home_won}`);
    console.log(`Away Won: ${denverGame.away_won}`);
    console.log(`ESPN Event ID: ${denverGame.espn_event_id}`);

    const denverWon = denverGame.home_team_id === denverTeam.id
      ? denverGame.home_won
      : denverGame.away_won;

    console.log(`\nDenver won: ${denverWon}`);
  } else {
    console.log('❌ No Denver game found in Week 13!');
    console.log('\nThis means the game result hasn\'t been fetched from ESPN yet.');
    console.log('You can manually fetch it by calling the Edge Function or waiting for the cron job.');
  }

  // Check ESPN API for Week 13 scoreboard
  console.log('\n\n🏈 Checking ESPN API for Week 13...');
  const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=13&dates=2025';

  try {
    const response = await fetch(espnUrl);
    const data = await response.json();

    console.log(`ESPN API returned ${data.events?.length || 0} games for Week 13\n`);

    if (data.events) {
      // Find Denver game
      const denverESPNGame = data.events.find(event => {
        const competitors = event.competitions?.[0]?.competitors || [];
        return competitors.some(c => c.team?.abbreviation === 'DEN');
      });

      if (denverESPNGame) {
        const comp = denverESPNGame.competitions[0];
        const homeTeam = comp.competitors.find(c => c.homeAway === 'home');
        const awayTeam = comp.competitors.find(c => c.homeAway === 'away');

        console.log('✅ Found Denver game on ESPN:');
        console.log(`Matchup: ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`);
        console.log(`Score: ${awayTeam.score}-${homeTeam.score}`);
        console.log(`Status: ${comp.status.type.completed ? 'final' : 'in_progress'}`);
        console.log(`Denver won: ${awayTeam.team.abbreviation === 'DEN' ? awayTeam.winner : homeTeam.winner}`);
      }
    }
  } catch (error) {
    console.error('Error fetching from ESPN:', error.message);
  }
}

checkDenverWeek13().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
