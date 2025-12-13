const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkSeasons() {
  console.log('🔍 Checking available seasons...\n');

  // Get all unique seasons from weeks
  const { data: weeks } = await supabase
    .from('weeks')
    .select('season_year')
    .order('season_year', { ascending: false });

  const uniqueSeasons = [...new Set(weeks.map(w => w.season_year))];

  console.log('Available seasons in weeks table:');
  uniqueSeasons.forEach(year => console.log(`  ${year}`));

  // Get player counts per season
  console.log('\n📊 Player counts per season:');
  for (const year of uniqueSeasons) {
    const { data: players } = await supabase
      .from('players')
      .select('id')
      .eq('season_year', year);

    console.log(`  ${year}: ${players.length} players`);
  }

  // Get picks counts per season
  console.log('\n📊 Picks counts per season:');
  for (const year of uniqueSeasons) {
    const { data: weekIds } = await supabase
      .from('weeks')
      .select('id')
      .eq('season_year', year);

    const weekIdArray = weekIds.map(w => w.id);

    const { data: picks } = await supabase
      .from('picks')
      .select('id')
      .in('week_id', weekIdArray);

    console.log(`  ${year}: ${picks.length} picks`);
  }

  console.log('\n✅ Current/Latest season:', Math.max(...uniqueSeasons));
}

checkSeasons().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
