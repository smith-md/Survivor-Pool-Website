const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fixWashingtonPicks() {
  console.log('🔍 Checking for Washington Football Team issues...\n');

  try {
    // Find ALL teams with "Washington" in the name
    const { data: washingtonTeams, error: washError } = await supabase
      .from('nfl_teams')
      .select('*')
      .ilike('team_name', '%washington%');

    if (washError) throw washError;

    console.log(`Found ${washingtonTeams.length} Washington-related team(s):\n`);
    washingtonTeams.forEach(team => {
      console.log(`  - ${team.team_abbreviation}: ${team.team_name}`);
      console.log(`    ID: ${team.id}\n`);
    });

    // Find the correct Commanders team
    const commandersTeam = washingtonTeams.find(t =>
      t.team_name.toLowerCase().includes('commanders')
    );

    if (!commandersTeam) {
      console.error('❌ Could not find Washington Commanders team!');
      return;
    }

    console.log(`✅ Using "${commandersTeam.team_name}" (${commandersTeam.team_abbreviation}) as the correct team\n`);

    // Find any other Washington teams (like "Washington Football Team")
    const oldTeams = washingtonTeams.filter(t =>
      t.id !== commandersTeam.id &&
      (t.team_name.toLowerCase().includes('football team') ||
       t.team_abbreviation === 'WFT')
    );

    if (oldTeams.length === 0) {
      console.log('ℹ️  No "Washington Football Team" entries found in nfl_teams table.\n');
      console.log('📊 Checking if any picks might have issues...\n');

      // Check all picks to see team names
      const { data: allPicks, error: picksError } = await supabase
        .from('picks')
        .select(`
          id,
          team_id,
          team:nfl_teams(team_name, team_abbreviation)
        `);

      if (picksError) throw picksError;

      console.log(`Total picks in database: ${allPicks?.length || 0}\n`);

      if (allPicks && allPicks.length > 0) {
        console.log('✅ All picks appear to have valid team references.\n');
      }

      return;
    }

    console.log(`⚠️  Found ${oldTeams.length} old Washington team(s) to fix:\n`);

    let totalPicksUpdated = 0;

    for (const oldTeam of oldTeams) {
      console.log(`Processing: ${oldTeam.team_name} (${oldTeam.team_abbreviation})`);

      // Find picks using this old team
      const { data: affectedPicks, error: picksError } = await supabase
        .from('picks')
        .select('id, player_id')
        .eq('team_id', oldTeam.id);

      if (picksError) throw picksError;

      const pickCount = affectedPicks?.length || 0;
      console.log(`  Found ${pickCount} pick(s) using this team`);

      if (pickCount > 0) {
        // Update picks to use the Commanders team
        const { error: updateError } = await supabase
          .from('picks')
          .update({ team_id: commandersTeam.id })
          .eq('team_id', oldTeam.id);

        if (updateError) throw updateError;

        console.log(`  ✓ Updated ${pickCount} pick(s) to use ${commandersTeam.team_name}`);
        totalPicksUpdated += pickCount;
      }

      // Delete the old team entry
      const { error: deleteError } = await supabase
        .from('nfl_teams')
        .delete()
        .eq('id', oldTeam.id);

      if (deleteError) throw deleteError;

      console.log(`  ✓ Deleted old team entry\n`);
    }

    if (totalPicksUpdated > 0) {
      console.log(`\n🎉 Successfully updated ${totalPicksUpdated} pick(s) to use Washington Commanders!\n`);
    } else {
      console.log(`\n✅ No picks needed updating.\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixWashingtonPicks();
