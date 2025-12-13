const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function insertDenverWashGame() {
  console.log('🏈 Manually inserting Denver @ Washington game...\n');

  // Get team IDs
  const { data: denverTeam } = await supabase
    .from('nfl_teams')
    .select('id')
    .eq('team_abbreviation', 'DEN')
    .single();

  const { data: washingtonTeam } = await supabase
    .from('nfl_teams')
    .select('id')
    .eq('team_abbreviation', 'WAS')
    .single();

  // Get Week 13 ID
  const { data: week13 } = await supabase
    .from('weeks')
    .select('id')
    .eq('week_number', 13)
    .eq('season_year', 2025)
    .single();

  console.log(`Denver ID: ${denverTeam.id}`);
  console.log(`Washington ID: ${washingtonTeam.id}`);
  console.log(`Week 13 ID: ${week13.id}\n`);

  // Insert the game
  const gameData = {
    espn_event_id: '401772931',
    week_id: week13.id,
    home_team_id: washingtonTeam.id,  // Washington was home
    away_team_id: denverTeam.id,       // Denver was away
    home_score: 26,
    away_score: 27,
    home_won: false,
    away_won: true,
    game_status: 'final',
    game_date: new Date('2025-12-01T18:00:00Z').toISOString()
  };

  console.log('Inserting game data:');
  console.log(JSON.stringify(gameData, null, 2));
  console.log();

  const { data: insertedGame, error: insertError } = await supabase
    .from('nfl_games')
    .insert([gameData])
    .select();

  if (insertError) {
    console.error('❌ Error inserting game:', insertError);
    return;
  }

  console.log('✅ Game inserted successfully!');
  console.log('Game ID:', insertedGame[0].id);
  console.log('\n🔄 The database trigger should now update Clarissa\'s pick automatically...\n');

  // Wait a moment for the trigger to fire
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check Clarissa's pick
  const { data: clarissa } = await supabase
    .from('players')
    .select('id')
    .or('first_name.ilike.%Clarissa%,last_name.ilike.%Clarissa%')
    .single();

  const { data: clarissaPicks } = await supabase
    .from('picks')
    .select(`
      *,
      week:weeks(week_number),
      team:nfl_teams(team_abbreviation)
    `)
    .eq('player_id', clarissa.id)
    .eq('week_id', week13.id);

  if (clarissaPicks && clarissaPicks.length > 0) {
    const pick = clarissaPicks[0];
    console.log('📊 Clarissa\'s Week 13 pick status:');
    console.log(`   Team: ${pick.team.team_abbreviation}`);
    console.log(`   Team Won: ${pick.team_won}`);
    console.log(`   Is Strike: ${pick.is_strike}`);
    console.log(`   Status: ${pick.team_won ? '✅ WIN' : pick.team_won === false ? '❌ LOSS' : '⚪ PENDING'}`);
  }

  console.log('\n✅ Done! Refresh the pool page to see Clarissa\'s Denver pick show as green!');
}

insertDenverWashGame().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
