const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkTeams() {
  console.log('🔍 Checking nfl_teams table structure...\n');

  const { data: teams, error } = await supabase
    .from('nfl_teams')
    .select('*')
    .limit(3);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('Sample teams data:');
  console.log(JSON.stringify(teams, null, 2));
}

checkTeams().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
