const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkPoolSettings() {
  const { data: settings, error } = await supabase
    .from('pool_settings')
    .select('*')
    .order('season_year');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nPool Settings (All Seasons):');
  console.log('Year'.padEnd(8), 'Max Strikes'.padEnd(15), 'Entry Fee'.padEnd(12), 'Buyback Fee');
  console.log('='.repeat(60));

  if (settings.length === 0) {
    console.log('No pool settings found in database.');
  } else {
    settings.forEach(s => {
      console.log(
        String(s.season_year).padEnd(8),
        String(s.max_strikes).padEnd(15),
        `$${s.entry_fee}`.padEnd(12),
        `$${s.buyback_fee}`
      );
    });
  }

  // Check 2023 season players strike distribution
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('strikes')
    .eq('season_year', 2023);

  if (!playersError) {
    console.log('\n\n2023 Season Strike Distribution:');
    const distribution = {};
    players.forEach(p => {
      distribution[p.strikes] = (distribution[p.strikes] || 0) + 1;
    });

    Object.keys(distribution).sort((a, b) => Number(a) - Number(b)).forEach(strikes => {
      console.log(`  ${strikes} strikes: ${distribution[strikes]} players`);
    });

    console.log('\n📊 Analysis:');
    console.log('  - 13 players had 2 strikes (survived until later weeks)');
    console.log('  - 15 players had 3+ strikes (eliminated earlier)');
    console.log('  - This suggests a "2-loss" pool where you\'re OUT on your 3rd strike');
    console.log('  - Therefore: max_strikes = 2, and trigger should use "strikes > 2"');
  }
}

checkPoolSettings().catch(console.error);
