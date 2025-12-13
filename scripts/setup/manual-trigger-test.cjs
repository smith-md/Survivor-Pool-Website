const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function manualTriggerTest() {
  console.log('🧪 Manual Trigger Test\n');
  console.log('This will force-update a game to trigger pick updates.\n');

  // Get a final game
  const { data: game } = await supabase
    .from('nfl_games')
    .select(`
      id,
      espn_event_id,
      week_id,
      game_status,
      updated_at,
      week:weeks(week_number),
      home_team:nfl_teams!nfl_games_home_team_id_fkey(team_abbreviation),
      away_team:nfl_teams!nfl_games_away_team_id_fkey(team_abbreviation)
    `)
    .eq('game_status', 'final')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (!game) {
    console.log('❌ No final games found');
    return;
  }

  const matchup = `${game.away_team.team_abbreviation} @ ${game.home_team.team_abbreviation}`;
  console.log(`Selected game: ${matchup} (Week ${game.week.week_number})`);
  console.log(`Current status: ${game.game_status}`);
  console.log(`Last updated: ${new Date(game.updated_at).toLocaleString()}\n`);

  // Get picks BEFORE trigger
  const { data: picksBefore } = await supabase
    .from('picks')
    .select('id, team_won, is_strike')
    .eq('week_id', game.week_id)
    .or(`team_id.eq.${game.home_team_id},team_id.eq.${game.away_team_id}`);

  console.log(`Picks before update: ${picksBefore?.length || 0}`);
  if (picksBefore && picksBefore.length > 0) {
    const updated = picksBefore.filter(p => p.team_won !== null).length;
    console.log(`  - Already updated: ${updated}`);
    console.log(`  - Still pending: ${picksBefore.length - updated}\n`);
  }

  // Force an update to the game (this should fire the trigger)
  console.log('⚡ Forcing game update to trigger pick updates...');
  const { error: updateError } = await supabase
    .from('nfl_games')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', game.id);

  if (updateError) {
    console.log('❌ Error updating game:', updateError.message);
    return;
  }

  console.log('✅ Game updated successfully');

  // Wait a moment for trigger to process
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Get picks AFTER trigger
  const { data: picksAfter } = await supabase
    .from('picks')
    .select('id, team_won, is_strike, updated_at')
    .eq('week_id', game.week_id)
    .or(`team_id.eq.${game.home_team_id},team_id.eq.${game.away_team_id}`);

  console.log(`\nPicks after update: ${picksAfter?.length || 0}`);
  if (picksAfter && picksAfter.length > 0) {
    const updated = picksAfter.filter(p => p.team_won !== null).length;
    console.log(`  - Updated: ${updated}`);
    console.log(`  - Still pending: ${picksAfter.length - updated}`);

    // Check if any picks were updated in the last 5 seconds
    const recentlyUpdated = picksAfter.filter(p => {
      const updatedAt = new Date(p.updated_at);
      const now = new Date();
      return (now - updatedAt) < 5000;
    });

    if (recentlyUpdated.length > 0) {
      console.log(`\n✅ TRIGGER FIRED: ${recentlyUpdated.length} picks updated in last 5 seconds`);
    } else if (updated === picksAfter.length) {
      console.log(`\nℹ️  All picks already updated (trigger likely fired earlier)`);
    } else {
      console.log(`\n⚠️  Trigger may not have fired (no recent updates detected)`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Note: If picks were already updated, the trigger condition');
  console.log('"team_won IS NULL" prevents re-processing (this is correct).');
  console.log('='.repeat(60));
}

manualTriggerTest();
