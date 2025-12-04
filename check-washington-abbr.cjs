const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkWashington() {
  console.log('🔍 Checking Washington team abbreviation...\n');

  // Check all Washington variations
  const { data: teams } = await supabase
    .from('nfl_teams')
    .select('*')
    .or('team_abbreviation.eq.WAS,team_abbreviation.eq.WSH,team_name.ilike.%Washington%');

  console.log(`Found ${teams.length} team(s):\n`);
  teams.forEach(team => {
    console.log(`Team: ${team.team_name}`);
    console.log(`Abbreviation: ${team.team_abbreviation}`);
    console.log(`ID: ${team.id}\n`);
  });

  // Check what ESPN is using
  console.log('🏈 Checking ESPN API for Washington games...\n');
  const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=13&dates=2025';

  try {
    const response = await fetch(espnUrl);
    const data = await response.json();

    // Find games with Washington
    const washingtonGames = data.events.filter(event => {
      const competitors = event.competitions?.[0]?.competitors || [];
      return competitors.some(c =>
        c.team?.abbreviation === 'WSH' ||
        c.team?.abbreviation === 'WAS' ||
        c.team?.name?.includes('Washington')
      );
    });

    console.log(`Found ${washingtonGames.length} Washington game(s) on ESPN:\n`);
    washingtonGames.forEach(game => {
      const comp = game.competitions[0];
      const homeTeam = comp.competitors.find(c => c.homeAway === 'home');
      const awayTeam = comp.competitors.find(c => c.homeAway === 'away');
      console.log(`${awayTeam.team.abbreviation} (ID: ${awayTeam.team.id}) @ ${homeTeam.team.abbreviation} (ID: ${homeTeam.team.id})`);
      console.log(`Score: ${awayTeam.score}-${homeTeam.score}`);
      console.log(`ESPN Event ID: ${game.id}\n`);
    });
  } catch (error) {
    console.error('Error fetching ESPN data:', error.message);
  }
}

checkWashington().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
