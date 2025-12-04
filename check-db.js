import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('Checking database structure...\n');

  // Check nfl_teams table
  console.log('1. Checking nfl_teams table:');
  const { data: teams, error: teamsError } = await supabase
    .from('nfl_teams')
    .select('*')
    .limit(3);

  if (teamsError) {
    console.error('Error querying nfl_teams:', teamsError);
  } else {
    console.log(`Found ${teams?.length || 0} teams`);
    if (teams && teams.length > 0) {
      console.log('Sample team:', teams[0]);
      console.log('Columns:', Object.keys(teams[0]));
    }
  }

  // Check weeks table
  console.log('\n2. Checking weeks table:');
  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_year', 2025)
    .limit(3);

  if (weeksError) {
    console.error('Error querying weeks:', weeksError);
  } else {
    console.log(`Found ${weeks?.length || 0} weeks for 2025`);
    if (weeks && weeks.length > 0) {
      console.log('Sample week:', weeks[0]);
    }
  }

  // Check players table
  console.log('\n3. Checking players table:');
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .limit(3);

  if (playersError) {
    console.error('Error querying players:', playersError);
  } else {
    console.log(`Found ${players?.length || 0} existing players`);
  }

  // Check picks table
  console.log('\n4. Checking picks table:');
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select('*')
    .limit(3);

  if (picksError) {
    console.error('Error querying picks:', picksError);
  } else {
    console.log(`Found ${picks?.length || 0} existing picks`);
  }
}

checkDatabase().catch(console.error);
