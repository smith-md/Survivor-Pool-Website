import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateNames() {
  console.log('Starting name migration...\n');

  // Fetch all players
  const { data: players, error: fetchError } = await supabase
    .from('players')
    .select('id, name')
    .eq('season_year', 2025);

  if (fetchError) {
    console.error('Error fetching players:', fetchError);
    return;
  }

  console.log(`Found ${players.length} players to migrate\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const player of players) {
    // Split the name
    const nameParts = player.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || null;

    console.log(`Migrating: "${player.name}"`);
    console.log(`  -> First: "${firstName}", Last: "${lastName || '(none)'}"`);

    // Update the player record
    const { error: updateError } = await supabase
      .from('players')
      .update({
        first_name: firstName,
        last_name: lastName
      })
      .eq('id', player.id);

    if (updateError) {
      console.error(`  ❌ Error updating player:`, updateError);
      errorCount++;
    } else {
      console.log(`  ✓ Updated successfully`);
      successCount++;
    }
    console.log('');
  }

  console.log('\n========== MIGRATION SUMMARY ==========');
  console.log(`Successfully updated: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('=======================================\n');

  // Verify the migration
  console.log('Verifying migration...');
  const { data: verifyPlayers, error: verifyError } = await supabase
    .from('players')
    .select('name, first_name, last_name')
    .eq('season_year', 2025)
    .order('name')
    .limit(5);

  if (verifyError) {
    console.error('Error verifying:', verifyError);
  } else {
    console.log('\nSample of migrated data (first 5 players):');
    console.log('==========================================');
    verifyPlayers.forEach(p => {
      console.log(`Name: "${p.name}"`);
      console.log(`  First: "${p.first_name}", Last: "${p.last_name || '(null)'}"`);
    });
  }
}

migrateNames().catch(console.error);
