const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fixWashingtonTeam() {
  console.log('🔍 Checking for Washington Football Team references...\n');

  try {
    // Find all teams in the database
    const { data: allTeams, error: allTeamsError } = await supabase
      .from('nfl_teams')
      .select('*');

    if (allTeamsError) throw allTeamsError;

    console.log('All teams in database:');
    allTeams.forEach(team => {
      if (team.full_name.toLowerCase().includes('washington')) {
        console.log(`  ✓ ${team.team_abbreviation}: ${team.full_name} (ID: ${team.id})`);
      }
    });
    console.log('');

    // Find the correct Washington Commanders team
    const { data: commandersTeam, error: commandersError } = await supabase
      .from('nfl_teams')
      .select('*')
      .eq('team_abbreviation', 'WSH')
      .single();

    if (commandersError) throw commandersError;

    console.log(`✅ Found correct Washington team:`);
    console.log(`   ${commandersTeam.team_abbreviation}: ${commandersTeam.full_name}`);
    console.log(`   Team ID: ${commandersTeam.id}\n`);

    // Find any "Washington Football Team" entries
    const { data: oldTeams, error: oldTeamsError } = await supabase
      .from('nfl_teams')
      .select('*')
      .ilike('full_name', '%Washington Football Team%');

    if (oldTeamsError) throw oldTeamsError;

    if (oldTeams && oldTeams.length > 0) {
      console.log(`⚠️  Found ${oldTeams.length} old "Washington Football Team" entries:\n`);

      for (const oldTeam of oldTeams) {
        console.log(`   ${oldTeam.team_abbreviation}: ${oldTeam.full_name} (ID: ${oldTeam.id})`);

        // Find picks using this old team
        const { data: affectedPicks, error: picksError } = await supabase
          .from('picks')
          .select('id, player_id, week_id')
          .eq('team_id', oldTeam.id);

        if (picksError) throw picksError;

        console.log(`   → Found ${affectedPicks?.length || 0} picks using this team`);

        if (affectedPicks && affectedPicks.length > 0) {
          // Update picks to use the correct Commanders team
          const { error: updateError } = await supabase
            .from('picks')
            .update({ team_id: commandersTeam.id })
            .eq('team_id', oldTeam.id);

          if (updateError) throw updateError;

          console.log(`   ✓ Updated ${affectedPicks.length} picks to use Washington Commanders`);
        }

        // Delete the old team entry
        const { error: deleteError } = await supabase
          .from('nfl_teams')
          .delete()
          .eq('id', oldTeam.id);

        if (deleteError) throw deleteError;

        console.log(`   ✓ Deleted old team entry\n`);
      }

      console.log('✅ All Washington Football Team references have been updated!\n');
    } else {
      console.log('✅ No old "Washington Football Team" entries found. Database is already up to date!\n');
    }

    // Check if any picks reference "WAS" or "WFT" abbreviations that might have been imported
    console.log('🔍 Checking for picks with old Washington abbreviations...');

    const { data: allPicks, error: allPicksError } = await supabase
      .from('picks')
      .select(`
        id,
        team_id,
        team:nfl_teams(team_abbreviation, full_name)
      `);

    if (allPicksError) throw allPicksError;

    const oldAbbrevPicks = allPicks?.filter(pick =>
      pick.team?.team_abbreviation === 'WAS' ||
      pick.team?.team_abbreviation === 'WFT'
    );

    if (oldAbbrevPicks && oldAbbrevPicks.length > 0) {
      console.log(`⚠️  Found ${oldAbbrevPicks.length} picks using old abbreviations (WAS/WFT)`);
      console.log('   These might need manual review.');
    } else {
      console.log('✅ No picks found with old abbreviations.\n');
    }

    console.log('🎉 Script completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixWashingtonTeam();
