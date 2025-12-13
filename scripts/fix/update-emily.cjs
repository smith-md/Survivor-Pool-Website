const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function updateEmily() {
  const { data, error } = await supabase
    .from('players')
    .update({ is_eliminated: false })
    .eq('first_name', 'Emily')
    .eq('last_name', 'Arb')
    .select();

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('✓ Updated Emily Arb to Buyback Pending (is_eliminated = false)');
  console.log('  strikes:', data[0].strikes);
  console.log('  is_eliminated:', data[0].is_eliminated);
  console.log('  has_bought_back:', data[0].has_bought_back);
}

updateEmily();
