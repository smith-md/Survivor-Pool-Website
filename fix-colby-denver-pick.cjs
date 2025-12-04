const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fixColbyDenverPick() {
  const pickId = '512e1da5-e110-47eb-900b-65ad1c5ec3f7';

  console.log('\n🔧 Fixing Colby S\'s Week 16 Denver pick...\n');

  // Get current pick status
  const { data: currentPick, error: fetchError } = await supabase
    .from('picks')
    .select(`
      *,
      week:weeks(week_number, season_year),
      team:nfl_teams(team_abbreviation, team_name),
      player:players(name, first_name, last_name)
    `)
    .eq('id', pickId)
    .single();

  if (fetchError) {
    console.error('Error fetching pick:', fetchError);
    return;
  }

  const playerName = currentPick.player.name || `${currentPick.player.first_name} ${currentPick.player.last_name}`;
  console.log('Player:', playerName);
  console.log('Week:', currentPick.week.week_number);
  console.log('Team:', currentPick.team.team_name);
  console.log('\nCurrent status:');
  console.log('  team_won:', currentPick.team_won);
  console.log('  is_strike:', currentPick.is_strike);

  // Update the pick
  const { data: updatedPick, error: updateError } = await supabase
    .from('picks')
    .update({
      team_won: false,
      is_strike: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', pickId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating pick:', updateError);
    return;
  }

  console.log('\n✅ Pick updated successfully!');
  console.log('New status:');
  console.log('  team_won:', updatedPick.team_won);
  console.log('  is_strike:', updatedPick.is_strike);

  // Now update player's strike count
  const { data: player, error: playerFetchError } = await supabase
    .from('players')
    .select('id, name, first_name, last_name, strikes')
    .eq('id', currentPick.player_id)
    .single();

  if (playerFetchError) {
    console.error('Error fetching player:', playerFetchError);
    return;
  }

  // Count actual strikes
  const { data: allPicks, error: picksError } = await supabase
    .from('picks')
    .select('is_strike')
    .eq('player_id', player.id);

  if (picksError) {
    console.error('Error counting strikes:', picksError);
    return;
  }

  const actualStrikes = allPicks.filter(p => p.is_strike).length;

  console.log('\n🔢 Updating player strike count...');
  console.log('Previous strikes:', player.strikes);
  console.log('Actual strikes (recounted):', actualStrikes);

  // Update player strikes
  const { data: updatedPlayer, error: playerUpdateError } = await supabase
    .from('players')
    .update({
      strikes: actualStrikes,
      updated_at: new Date().toISOString()
    })
    .eq('id', player.id)
    .select()
    .single();

  if (playerUpdateError) {
    console.error('Error updating player:', playerUpdateError);
    return;
  }

  console.log('New strikes:', updatedPlayer.strikes);
  console.log('\n✅ All fixes complete!');
  console.log('\nSummary:');
  console.log('  - Colby S\'s Week 16 Denver pick now correctly shows as a loss');
  console.log('  - Strike count updated from', player.strikes, 'to', updatedPlayer.strikes);
}

fixColbyDenverPick().catch(console.error);
