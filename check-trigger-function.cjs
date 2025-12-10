const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggerFunction() {
  // Query the actual function definition from the database
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT prosrc
        FROM pg_proc
        WHERE proname = 'update_picks_from_game_result';
      `
    });

  if (error) {
    // If rpc doesn't work, try a direct query approach
    console.log('Cannot query function directly. Checking for other triggers on players table...');

    const { data: triggers, error: trigError } = await supabase
      .from('pg_trigger')
      .select('*');

    if (trigError) {
      console.log('Error:', trigError.message);
    } else {
      console.log('Triggers found:', triggers);
    }
  } else {
    console.log('Function source:', data);
  }
}

checkTriggerFunction();
