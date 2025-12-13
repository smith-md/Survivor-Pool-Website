const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function updateWashingtonAbbr() {
  console.log('🔄 Updating Washington abbreviation from WAS to WSH...\n');

  // First, check current state
  const { data: washTeam, error: fetchError } = await supabase
    .from('nfl_teams')
    .select('*')
    .eq('team_abbreviation', 'WAS')
    .single();

  if (fetchError) {
    console.error('❌ Error finding Washington team:', fetchError);
    return;
  }

  console.log('Current team data:');
  console.log(`  ID: ${washTeam.id}`);
  console.log(`  Name: ${washTeam.team_name}`);
  console.log(`  Abbreviation: ${washTeam.team_abbreviation}`);
  console.log();

  // Check how many picks reference this team
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select('id')
    .eq('team_id', washTeam.id);

  if (picksError) {
    console.error('❌ Error checking picks:', picksError);
    return;
  }

  console.log(`📊 Found ${picks.length} picks using Washington`);

  // Check how many games reference this team
  const { data: games, error: gamesError } = await supabase
    .from('nfl_games')
    .select('id')
    .or(`home_team_id.eq.${washTeam.id},away_team_id.eq.${washTeam.id}`);

  if (gamesError) {
    console.error('❌ Error checking games:', gamesError);
    return;
  }

  console.log(`📊 Found ${games.length} games involving Washington`);
  console.log();

  // Perform the update
  console.log('🔄 Updating abbreviation to WSH...');

  const { error: updateError } = await supabase
    .from('nfl_teams')
    .update({ team_abbreviation: 'WSH' })
    .eq('id', washTeam.id);

  if (updateError) {
    console.error('❌ Error updating team:', updateError);
    return;
  }

  console.log('✅ Successfully updated Washington abbreviation to WSH!');

  // Verify the update
  const { data: updatedTeam } = await supabase
    .from('nfl_teams')
    .select('*')
    .eq('id', washTeam.id)
    .single();

  console.log('\n✅ Verified update:');
  console.log(`  Name: ${updatedTeam.team_name}`);
  console.log(`  Abbreviation: ${updatedTeam.team_abbreviation}`);
  console.log();

  console.log('📝 Note: All picks and games still reference the team by ID, so they are unaffected.');
  console.log('🎯 The team logos and abbreviations displayed will now show "WSH" instead of "WAS".');
  console.log('\n✅ Done! Refresh your app to see the updated abbreviation.');
}

updateWashingtonAbbr().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
