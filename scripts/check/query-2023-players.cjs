const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function query2023Players() {
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('season_year', 2023)
    .order('strikes');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n2023 Season - All Players:\n');
  console.log('Name'.padEnd(25), 'Strikes', 'Eliminated', 'Active');
  console.log('='.repeat(60));

  players.forEach(p => {
    const name = (p.first_name ? `${p.first_name} ${p.last_name || ''}` : p.name).trim();
    console.log(
      name.padEnd(25),
      String(p.strikes).padEnd(7),
      String(p.is_eliminated).padEnd(10),
      String(p.is_active)
    );
  });

  // Find Harry specifically
  const harry = players.find(p => {
    const name = (p.first_name || p.name || '').toLowerCase();
    return name.includes('harry');
  });

  if (harry) {
    console.log('\n🔍 Harry\'s Record:');
    console.log(JSON.stringify(harry, null, 2));
  } else {
    console.log('\n⚠️  Could not find player named Harry');
  }
}

query2023Players().catch(console.error);
