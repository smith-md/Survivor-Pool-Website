const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function verify2024Data() {
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('season_year', 2024);

  const { data: picks } = await supabase
    .from('picks')
    .select('*')
    .in('player_id', players.map(p => p.id));

  console.log('✅ 2024 Season Data Verification:\n');
  console.log(`  Players: ${players.length}`);
  console.log(`  Picks: ${picks.length}`);
  console.log(`  Eliminated: ${players.filter(p => p.is_eliminated).length}`);
  console.log(`  Active: ${players.filter(p => p.is_active).length}`);
  console.log(`\n📺 Visit http://localhost:5173/archive to see the 2024 season!`);
}

verify2024Data().catch(console.error);
