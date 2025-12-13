const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fixBuybackPending() {
  // Set Emily Arb and Alexis Bockting to Buyback Pending
  const playersToFix = [
    { first_name: 'Emily', last_name: 'Arb' },
    { first_name: 'Alexis', last_name: 'Bockting' }
  ];

  for (const player of playersToFix) {
    const { data, error } = await supabase
      .from('players')
      .update({ is_eliminated: false })
      .eq('first_name', player.first_name)
      .eq('last_name', player.last_name)
      .select();

    if (error) {
      console.log(`Error updating ${player.first_name} ${player.last_name}:`, error.message);
    } else {
      console.log(`✓ Updated ${player.first_name} ${player.last_name} to Buyback Pending`);
      console.log(`  strikes: ${data[0].strikes}, is_eliminated: ${data[0].is_eliminated}, has_bought_back: ${data[0].has_bought_back}`);
    }
  }
}

fixBuybackPending();
