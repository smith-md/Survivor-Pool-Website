const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkEmily() {
  const { data: emily, error } = await supabase
    .from('players')
    .select('*')
    .eq('first_name', 'Emily')
    .eq('last_name', 'Arb')
    .single();

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Emily Arb current status:');
  console.log('  strikes:', emily.strikes);
  console.log('  is_eliminated:', emily.is_eliminated);
  console.log('  has_bought_back:', emily.has_bought_back);
  console.log('  entry_fee_paid:', emily.entry_fee_paid);
}

checkEmily();
