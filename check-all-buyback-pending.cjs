const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkBuybackPending() {
  const { data: players, error } = await supabase
    .from('players')
    .select('first_name, last_name, strikes, is_eliminated, has_bought_back')
    .eq('season_year', 2025)
    .eq('strikes', 2);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Players with 2 strikes:\n');
  console.log('Name'.padEnd(30) + 'Eliminated'.padEnd(15) + 'Bought Back'.padEnd(15) + 'Status');
  console.log('='.repeat(80));

  players.forEach(p => {
    const name = `${p.first_name} ${p.last_name}`.padEnd(30);
    const eliminated = (p.is_eliminated ? 'YES' : 'NO').padEnd(15);
    const boughtBack = (p.has_bought_back ? 'YES' : 'NO').padEnd(15);

    let status = '';
    if (p.has_bought_back) {
      status = 'Bought Back In';
    } else if (!p.is_eliminated) {
      status = 'BUYBACK PENDING';
    } else {
      status = 'Eliminated';
    }

    console.log(name + eliminated + boughtBack + status);
  });
}

checkBuybackPending();
