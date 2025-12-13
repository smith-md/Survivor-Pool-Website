const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkWeeks() {
  console.log('🔍 Checking weeks table structure...\n');

  const { data: weeks, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_year', 2025)
    .order('week_number', { ascending: true })
    .limit(3);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('Sample weeks data:');
  console.log(JSON.stringify(weeks, null, 2));
}

checkWeeks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
