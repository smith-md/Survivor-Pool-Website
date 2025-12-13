const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fetchWeek13Results() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Need: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  console.log('🏈 Invoking Edge Function to fetch Week 13 results...\n');
  console.log(`URL: ${supabaseUrl}/functions/v1/update-nfl-results?week=13\n`);

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/update-nfl-results?week=13`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n✅ Denver game should now be in the database!');
      console.log('✅ Clarissa\'s pick should now show as a WIN (green background)');
      console.log('\n💡 Refresh the pool page to see the update!');
    } else {
      console.error('❌ Error from Edge Function:');
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error invoking Edge Function:', error.message);
  }
}

fetchWeek13Results().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
