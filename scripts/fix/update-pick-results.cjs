const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function updatePickResults() {
  console.log('🔄 Updating pick results from nfl_games...\n');

  // Get all picks
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select(`
      id,
      team_id,
      week_id,
      team_won,
      player:players(first_name, last_name),
      team:nfl_teams(team_abbreviation),
      week:weeks(week_number)
    `);

  if (picksError) {
    console.error('❌ Error fetching picks:', picksError);
    return;
  }

  console.log(`Found ${picks.length} picks to process\n`);

  let updated = 0;
  let alreadySet = 0;
  let noGameFound = 0;
  let errors = 0;

  for (const pick of picks) {
    try {
      // Find game where this team played in this week
      const { data: games, error: gamesError } = await supabase
        .from('nfl_games')
        .select('*')
        .eq('week_id', pick.week_id)
        .or(`home_team_id.eq.${pick.team_id},away_team_id.eq.${pick.team_id}`)
        .eq('game_status', 'final');

      if (gamesError) {
        console.error(`❌ Error finding game for pick ${pick.id}:`, gamesError);
        errors++;
        continue;
      }

      if (!games || games.length === 0) {
        // No completed game found for this pick yet
        noGameFound++;
        continue;
      }

      const game = games[0];
      let teamWon = null;

      // Check if the team won
      if (game.home_team_id === pick.team_id) {
        teamWon = game.home_won;
      } else if (game.away_team_id === pick.team_id) {
        teamWon = game.away_won;
      }

      if (teamWon === null) {
        console.log(`⚠️  Could not determine result for pick ${pick.id}`);
        continue;
      }

      // Update the pick with the result
      const { error: updateError } = await supabase
        .from('picks')
        .update({
          team_won: teamWon,
          is_strike: !teamWon // If team didn't win, it's a strike
        })
        .eq('id', pick.id);

      if (updateError) {
        console.error(`❌ Error updating pick ${pick.id}:`, updateError);
        errors++;
        continue;
      }

      const playerName = `${pick.player?.first_name || ''} ${pick.player?.last_name || ''}`.trim();
      const result = teamWon ? '✅ WIN' : '❌ LOSS';
      console.log(`  ${playerName} - Week ${pick.week?.week_number} - ${pick.team?.team_abbreviation} - ${result}`);
      updated++;

    } catch (error) {
      console.error(`❌ Error processing pick ${pick.id}:`, error);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Updated: ${updated} picks`);
  console.log(`  ⏳ No game found yet: ${noGameFound} picks`);
  console.log(`  ❌ Errors: ${errors}`);
}

updatePickResults().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
