const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkESPNWashingtonAbbr() {
  console.log('🔍 Checking ESPN abbreviation for Washington across different weeks...\n');

  // Check Week 1
  console.log('=== WEEK 1 ===');
  console.log('ESPN API:');
  let response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=1&dates=2025');
  let data = await response.json();

  let washGame = data.events.find(e => {
    const comps = e.competitions?.[0]?.competitors || [];
    return comps.some(c => c.team?.name?.includes('Washington') || c.team?.abbreviation?.includes('WAS') || c.team?.abbreviation?.includes('WSH'));
  });

  if (washGame) {
    const comp = washGame.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    console.log(`  ${away.team.abbreviation} @ ${home.team.abbreviation}`);
    console.log(`  ESPN Event ID: ${washGame.id}`);
  }

  // Check database
  console.log('\nDatabase:');
  const { data: week1 } = await supabase
    .from('weeks')
    .select('id')
    .eq('week_number', 1)
    .eq('season_year', 2025)
    .single();

  const { data: week1Games } = await supabase
    .from('nfl_games')
    .select(`
      *,
      home_team:nfl_teams!home_team_id(team_abbreviation, team_name),
      away_team:nfl_teams!away_team_id(team_abbreviation, team_name)
    `)
    .eq('week_id', week1.id);

  const dbWashGame = week1Games.find(g =>
    g.home_team.team_name.includes('Washington') || g.away_team.team_name.includes('Washington')
  );

  if (dbWashGame) {
    console.log(`  ${dbWashGame.away_team.team_abbreviation} @ ${dbWashGame.home_team.team_abbreviation}`);
    console.log(`  ESPN Event ID: ${dbWashGame.espn_event_id}`);
  }

  // Check Week 13
  console.log('\n=== WEEK 13 ===');
  console.log('ESPN API:');
  response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=13&dates=2025');
  data = await response.json();

  washGame = data.events.find(e => {
    const comps = e.competitions?.[0]?.competitors || [];
    return comps.some(c => c.team?.name?.includes('Washington') || c.team?.abbreviation?.includes('WAS') || c.team?.abbreviation?.includes('WSH'));
  });

  if (washGame) {
    const comp = washGame.competitions[0];
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    console.log(`  ${away.team.abbreviation} @ ${home.team.abbreviation}`);
    console.log(`  ESPN Event ID: ${washGame.id}`);
  }

  // Check database (now that we inserted it)
  console.log('\nDatabase:');
  const { data: week13 } = await supabase
    .from('weeks')
    .select('id')
    .eq('week_number', 13)
    .eq('season_year', 2025)
    .single();

  const { data: week13Games } = await supabase
    .from('nfl_games')
    .select(`
      *,
      home_team:nfl_teams!home_team_id(team_abbreviation, team_name),
      away_team:nfl_teams!away_team_id(team_abbreviation, team_name)
    `)
    .eq('week_id', week13.id);

  const dbWashGame13 = week13Games.find(g =>
    g.home_team.team_name.includes('Washington') || g.away_team.team_name.includes('Washington')
  );

  if (dbWashGame13) {
    console.log(`  ${dbWashGame13.away_team.team_abbreviation} @ ${dbWashGame13.home_team.team_abbreviation}`);
    console.log(`  ESPN Event ID: ${dbWashGame13.espn_event_id}`);
  } else {
    console.log('  (Not found - but we just inserted it)');
  }

  // Check multiple weeks from ESPN to see if abbreviation changed
  console.log('\n=== CHECKING ESPN ABBREVIATION ACROSS ALL WEEKS ===\n');

  for (let week = 1; week <= 13; week++) {
    const resp = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=2025`);
    const weekData = await resp.json();

    const washingtonGame = weekData.events?.find(e => {
      const comps = e.competitions?.[0]?.competitors || [];
      return comps.some(c => c.team?.name?.includes('Washington'));
    });

    if (washingtonGame) {
      const comp = washingtonGame.competitions[0];
      const washTeam = comp.competitors.find(c => c.team?.name?.includes('Washington'));
      console.log(`Week ${String(week).padStart(2, ' ')}: ESPN uses "${washTeam.team.abbreviation}" for Washington`);
    }
  }
}

checkESPNWashingtonAbbr().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
