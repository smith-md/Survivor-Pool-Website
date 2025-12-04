const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check2023Winner() {
  const { data: players } = await supabase
    .from('players')
    .select('name, strikes, is_active, is_eliminated')
    .eq('season_year', 2023)
    .order('strikes');

  console.log('2023 Season Results:\n');

  const alive = players.filter(p => !p.is_eliminated);
  const eliminated = players.filter(p => p.is_eliminated);

  console.log(`✅ Survived: ${alive.length} player${alive.length !== 1 ? 's' : ''}`);
  alive.forEach(p => {
    console.log(`   - ${p.name} (${p.strikes} strike${p.strikes !== 1 ? 's' : ''})`);
  });

  console.log(`\n❌ Eliminated: ${eliminated.length} players`);

  if (alive.length === 1) {
    console.log(`\n🏆 2023 CHAMPION: ${alive[0].name}! 🏆`);
  } else if (alive.length > 1) {
    console.log(`\n🏆 ${alive.length} players tied as co-champions!`);
  } else {
    console.log(`\n💀 Everyone was eliminated!`);
  }
}

check2023Winner().catch(console.error);
