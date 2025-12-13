const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggerStatus() {
  console.log('🔍 Checking database trigger status...\n');

  // Check if trigger exists
  const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_update_picks_from_game';
    `
  });

  if (triggerError) {
    console.log('⚠️  Using alternative method to check trigger...\n');

    // Alternative: Just try to query the trigger function
    const { data: functions } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          routine_name,
          routine_type
        FROM information_schema.routines
        WHERE routine_name = 'update_picks_from_game_result';
      `
    });

    if (functions && functions.length > 0) {
      console.log('✅ Trigger function exists: update_picks_from_game_result');
    } else {
      console.log('❌ Trigger function NOT FOUND: update_picks_from_game_result');
    }
  } else if (triggers && triggers.length > 0) {
    console.log('✅ Trigger is installed:');
    console.log(`   Name: ${triggers[0].trigger_name}`);
    console.log(`   Table: ${triggers[0].event_object_table}`);
    console.log(`   Events: ${triggers[0].event_manipulation}`);
    console.log(`   Timing: ${triggers[0].action_timing}`);
  } else {
    console.log('❌ Trigger NOT FOUND: trigger_update_picks_from_game');
  }

  console.log('\n📊 Testing trigger behavior...\n');

  // Get a recent final game
  const { data: recentGame } = await supabase
    .from('nfl_games')
    .select(`
      id,
      espn_event_id,
      game_status,
      home_score,
      away_score,
      home_won,
      away_won,
      week:weeks(week_number),
      home_team:nfl_teams!nfl_games_home_team_id_fkey(team_abbreviation),
      away_team:nfl_teams!nfl_games_away_team_id_fkey(team_abbreviation)
    `)
    .eq('game_status', 'final')
    .not('home_won', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (recentGame) {
    console.log(`Recent game: ${recentGame.away_team.team_abbreviation} @ ${recentGame.home_team.team_abbreviation}`);
    console.log(`   Week: ${recentGame.week.week_number}`);
    console.log(`   Score: ${recentGame.away_score}-${recentGame.home_score}`);
    console.log(`   Status: ${recentGame.game_status}`);
    console.log(`   Winner: ${recentGame.home_won ? 'Home' : 'Away'}\n`);

    // Check if picks were updated for this game
    const { data: homePicks } = await supabase
      .from('picks')
      .select(`
        id,
        team_won,
        is_strike,
        player:players(first_name, last_name)
      `)
      .eq('week_id', recentGame.week.id)
      .eq('team_id', recentGame.home_team_id);

    const { data: awayPicks } = await supabase
      .from('picks')
      .select(`
        id,
        team_won,
        is_strike,
        player:players(first_name, last_name)
      `)
      .eq('week_id', recentGame.week.id)
      .eq('team_id', recentGame.away_team_id);

    const totalPicks = (homePicks?.length || 0) + (awayPicks?.length || 0);
    const updatedPicks = [...(homePicks || []), ...(awayPicks || [])].filter(p => p.team_won !== null);

    console.log(`📋 Picks for this game: ${totalPicks} total`);
    console.log(`   ✅ Updated: ${updatedPicks.length}`);
    console.log(`   ⏳ Pending: ${totalPicks - updatedPicks.length}`);

    if (updatedPicks.length === totalPicks && totalPicks > 0) {
      console.log('\n✅ TRIGGER IS WORKING: All picks were updated for this final game');
    } else if (totalPicks > 0 && updatedPicks.length === 0) {
      console.log('\n❌ TRIGGER MAY NOT BE WORKING: No picks were updated for this final game');
    } else if (totalPicks > 0) {
      console.log('\n⚠️  PARTIAL UPDATE: Some picks updated, some not (check team_won IS NULL condition)');
    } else {
      console.log('\n📝 No picks found for this game (players may not have picked these teams)');
    }
  } else {
    console.log('⚠️  No recent final games found to test against');
  }
}

checkTriggerStatus();
