const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function delete2024SampleData() {
  console.log('🗑️  Deleting 2024 Sample Data...\n');

  // Get all 2024 players
  const { data: players2024, error: playersError } = await supabase
    .from('players')
    .select('id, name')
    .eq('season_year', 2024);

  if (playersError) {
    console.error('❌ Error fetching 2024 players:', playersError.message);
    return;
  }

  console.log(`Found ${players2024.length} players to delete:\n`);
  players2024.forEach(p => console.log(`  - ${p.name}`));

  // Delete picks first (due to foreign key constraint)
  console.log('\n1️⃣ Deleting picks...');
  const { error: picksError } = await supabase
    .from('picks')
    .delete()
    .in('player_id', players2024.map(p => p.id));

  if (picksError) {
    console.error('  ❌ Error deleting picks:', picksError.message);
    return;
  }
  console.log('  ✅ Picks deleted');

  // Delete players
  console.log('\n2️⃣ Deleting players...');
  const { error: deletePlayersError } = await supabase
    .from('players')
    .delete()
    .eq('season_year', 2024);

  if (deletePlayersError) {
    console.error('  ❌ Error deleting players:', deletePlayersError.message);
    return;
  }
  console.log('  ✅ Players deleted');

  console.log('\n✅ 2024 sample data deleted successfully!');
  console.log('\n📝 Note: 2024 weeks and games are still in the database.');
  console.log('   You can now import your actual 2024 player data and picks.');
}

delete2024SampleData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
