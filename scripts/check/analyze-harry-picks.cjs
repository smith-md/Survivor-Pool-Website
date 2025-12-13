const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeHarryPicks() {
  // Get pool settings for 2023
  const { data: settings, error: settingsError } = await supabase
    .from('pool_settings')
    .select('*')
    .eq('season_year', 2023)
    .single();

  if (settingsError) {
    console.error('Error fetching settings:', settingsError);
  } else {
    console.log('\n2023 Pool Settings:');
    console.log('Max Strikes:', settings.max_strikes);
  }

  // Get Harry's picks
  const { data: harry, error: harryError } = await supabase
    .from('players')
    .select('id, first_name, last_name, strikes, is_eliminated')
    .eq('season_year', 2023)
    .ilike('first_name', 'Harry')
    .single();

  if (harryError) {
    console.error('Error finding Harry:', harryError);
    return;
  }

  console.log('\n\nHarry\'s Status:');
  console.log('Strikes:', harry.strikes);
  console.log('Is Eliminated:', harry.is_eliminated);

  // Get Harry's picks with details
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select(`
      *,
      week:weeks(week_number, season_year),
      team:nfl_teams(team_abbreviation, team_name)
    `)
    .eq('player_id', harry.id)
    .order('week(week_number)');

  if (picksError) {
    console.error('Error fetching picks:', picksError);
    return;
  }

  console.log('\n\nHarry\'s Picks (2023 Season):');
  console.log('Week'.padEnd(6), 'Team'.padEnd(25), 'Result'.padEnd(8), 'Strike');
  console.log('='.repeat(60));

  picks.forEach(pick => {
    const weekNum = `W${pick.week.week_number}`;
    const teamName = pick.team?.team_name || 'Unknown';
    const result = pick.team_won === null ? 'Pending' : (pick.team_won ? 'Won' : 'Lost');
    const strike = pick.is_strike ? 'Yes' : 'No';

    console.log(
      weekNum.padEnd(6),
      teamName.padEnd(25),
      result.padEnd(8),
      strike
    );
  });

  const strikeCount = picks.filter(p => p.is_strike).length;
  console.log('\n\nTotal Strikes:', strikeCount);
  console.log('Expected based on picks:', strikeCount, '| Actual in player record:', harry.strikes);
}

analyzeHarryPicks().catch(console.error);
