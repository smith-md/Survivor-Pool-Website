const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkJaylenStrikes() {
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .ilike('first_name', 'jaylen')
    .single();

  console.log(`Player: ${player.first_name} ${player.last_name}`);
  console.log(`Current strikes count: ${player.strikes}`);
  console.log(`Eliminated: ${player.is_eliminated}\n`);

  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select(`
      *,
      team:nfl_teams(team_abbreviation),
      week:weeks(week_number)
    `)
    .eq('player_id', player.id);

  if (picksError) {
    console.log('Error fetching picks:', picksError.message);
    return;
  }

  if (!picks || picks.length === 0) {
    console.log('No picks found for this player');
    return;
  }

  // Sort by week number
  picks.sort((a, b) => a.week.week_number - b.week.week_number);

  console.log('All picks:');
  picks.forEach(p => {
    const result = p.team_won === null ? 'PENDING' : (p.team_won ? 'WIN' : 'LOSS');
    const strike = p.is_strike ? '⚠️ STRIKE' : '';
    console.log(`  Week ${p.week.week_number}: ${p.team.team_abbreviation} - ${result} ${strike}`);
  });

  const actualStrikes = picks.filter(p => p.is_strike === true).length;
  console.log(`\nActual strikes in picks table: ${actualStrikes}`);
  console.log(`Player strikes field: ${player.strikes}`);

  if (actualStrikes !== player.strikes) {
    console.log('\n❌ MISMATCH! Recalculating player strikes...');

    const { error } = await supabase
      .from('players')
      .update({ strikes: actualStrikes })
      .eq('id', player.id);

    if (error) {
      console.log('Error updating strikes:', error.message);
    } else {
      console.log(`✅ Updated player strikes from ${player.strikes} to ${actualStrikes}`);
    }
  } else {
    console.log('\n✅ Strike count is correct');
  }
}

checkJaylenStrikes();
