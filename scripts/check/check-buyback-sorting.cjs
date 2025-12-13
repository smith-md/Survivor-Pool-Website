const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkBuybackSorting() {
  const { data: players, error } = await supabase
    .from('players')
    .select('first_name, last_name, buyback_status, has_paid, is_eliminated, has_bought_back, strikes')
    .eq('season_year', 2025);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('All Players with Buyback Info:\n');
  console.log('Name'.padEnd(30) + 'Buyback Status'.padEnd(20) + 'Eliminated'.padEnd(12) + 'Bought Back'.padEnd(15) + 'Paid'.padEnd(10) + 'Strikes');
  console.log('='.repeat(100));

  players.forEach(p => {
    const name = `${p.first_name} ${p.last_name}`.padEnd(30);
    const status = (p.buyback_status || 'null').padEnd(20);
    const eliminated = (p.is_eliminated ? 'YES' : 'NO').padEnd(12);
    const boughtBack = (p.has_bought_back ? 'YES' : 'NO').padEnd(15);
    const paid = (p.has_paid ? 'YES' : 'NO').padEnd(10);
    const strikes = p.strikes || 0;
    console.log(name + status + eliminated + boughtBack + paid + strikes);
  });

  // Find players that should be at top
  const pendingBuyback = players.filter(p => p.buyback_status === 'pending');
  const notPaid = players.filter(p => !p.has_paid && p.buyback_status !== 'pending');

  console.log('\n' + '='.repeat(100));
  console.log('\nPlayers that should be at TOP (Pending Buyback):');
  if (pendingBuyback.length === 0) {
    console.log('  None');
  } else {
    pendingBuyback.forEach(p => {
      console.log(`  - ${p.first_name} ${p.last_name} (buyback_status: ${p.buyback_status})`);
    });
  }

  console.log('\nPlayers that should be SECOND (Not Paid):');
  if (notPaid.length === 0) {
    console.log('  None');
  } else {
    notPaid.forEach(p => {
      console.log(`  - ${p.first_name} ${p.last_name} (has_paid: ${p.has_paid})`);
    });
  }

  // Check for eliminated players who might need buyback
  const eliminatedNoBuyback = players.filter(p =>
    p.is_eliminated && !p.has_bought_back && (p.buyback_status === null || p.buyback_status === undefined)
  );

  if (eliminatedNoBuyback.length > 0) {
    console.log('\n⚠️  Players who are ELIMINATED but have no buyback_status set:');
    eliminatedNoBuyback.forEach(p => {
      console.log(`  - ${p.first_name} ${p.last_name} (strikes: ${p.strikes}, buyback_status: ${p.buyback_status || 'null'})`);
    });
    console.log('\n💡 These players might need buyback_status set to "pending" if they can buy back in.');
  }
}

checkBuybackSorting();
