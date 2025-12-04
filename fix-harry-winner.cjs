const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fixHarryWinner() {
  // Find Harry's record
  const { data: harry, error: findError } = await supabase
    .from('players')
    .select('*')
    .eq('season_year', 2023)
    .ilike('first_name', 'Harry')
    .single();

  if (findError) {
    console.error('Error finding Harry:', findError);
    return;
  }

  console.log('Found Harry:', harry.first_name, harry.last_name);
  console.log('Current status - Strikes:', harry.strikes, '| Eliminated:', harry.is_eliminated, '| Active:', harry.is_active);

  // Update Harry to be the winner (not eliminated, active)
  const { data: updated, error: updateError } = await supabase
    .from('players')
    .update({
      is_eliminated: false,
      is_active: true
    })
    .eq('id', harry.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating Harry:', updateError);
    return;
  }

  console.log('\n✅ Harry updated successfully!');
  console.log('New status - Strikes:', updated.strikes, '| Eliminated:', updated.is_eliminated, '| Active:', updated.is_active);
  console.log('\n🏆 Harry T is now marked as the 2023 Champion! 🏆');
}

fixHarryWinner().catch(console.error);
