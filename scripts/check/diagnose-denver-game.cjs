const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseDenverGame() {
  console.log('🔍 Diagnosing Washington vs Denver game issue...\n');

  // 1. Find Clarissa
  console.log('1️⃣ Looking for Clarissa...');
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .or('first_name.ilike.%Clarissa%,last_name.ilike.%Clarissa%,name.ilike.%Clarissa%');

  if (playersError) {
    console.error('❌ Error finding Clarissa:', playersError);
    return;
  }

  if (!players || players.length === 0) {
    console.log('❌ Clarissa not found!');
    return;
  }

  const clarissa = players[0];
  console.log(`✅ Found: ${clarissa.first_name || clarissa.name} ${clarissa.last_name || ''} (ID: ${clarissa.id})`);
  console.log(`   Strikes: ${clarissa.strikes}, Eliminated: ${clarissa.is_eliminated}\n`);

  // 2. Find Denver team
  console.log('2️⃣ Looking for Denver Broncos...');
  const { data: denverTeam, error: denverError } = await supabase
    .from('nfl_teams')
    .select('*')
    .eq('team_abbreviation', 'DEN')
    .single();

  if (denverError) {
    console.error('❌ Error finding Denver:', denverError);
    return;
  }

  console.log(`✅ Found: ${denverTeam.team_name} (${denverTeam.team_abbreviation}) - ID: ${denverTeam.id}\n`);

  // 3. Find Washington team
  console.log('3️⃣ Looking for Washington...');
  const { data: washingtonTeam, error: washingtonError } = await supabase
    .from('nfl_teams')
    .select('*')
    .eq('team_abbreviation', 'WAS')
    .single();

  if (washingtonError) {
    console.error('❌ Error finding Washington:', washingtonError);
    return;
  }

  console.log(`✅ Found: ${washingtonTeam.team_name} (${washingtonTeam.team_abbreviation}) - ID: ${washingtonTeam.id}\n`);

  // 4. Find Clarissa's picks
  console.log('4️⃣ Finding Clarissa\'s recent picks...');
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select(`
      *,
      week:weeks(week_number, start_date, end_date),
      team:nfl_teams(team_abbreviation, team_name)
    `)
    .eq('player_id', clarissa.id)
    .order('week_id', { ascending: false })
    .limit(5);

  if (picksError) {
    console.error('❌ Error finding picks:', picksError);
    return;
  }

  console.log(`✅ Found ${picks.length} recent picks:`);
  picks.forEach(pick => {
    const status = pick.team_won === null ? '⚪ PENDING' : pick.team_won ? '✅ WIN' : '❌ LOSS';
    console.log(`   Week ${pick.week.week_number}: ${pick.team.team_abbreviation} - ${status}`);
  });
  console.log();

  // 5. Find games involving Denver and Washington
  console.log('5️⃣ Looking for Washington vs Denver game...');
  const { data: games, error: gamesError } = await supabase
    .from('nfl_games')
    .select(`
      *,
      week:weeks(week_number),
      home_team:nfl_teams!home_team_id(team_abbreviation, team_name),
      away_team:nfl_teams!away_team_id(team_abbreviation, team_name)
    `)
    .or(`home_team_id.eq.${denverTeam.id},away_team_id.eq.${denverTeam.id}`)
    .or(`home_team_id.eq.${washingtonTeam.id},away_team_id.eq.${washingtonTeam.id}`);

  if (gamesError) {
    console.error('❌ Error finding games:', gamesError);
    return;
  }

  console.log(`✅ Found ${games.length} games involving Denver or Washington:`);
  games.forEach(game => {
    const matchup = `${game.away_team.team_abbreviation} @ ${game.home_team.team_abbreviation}`;
    const score = game.game_status === 'final'
      ? `${game.away_score}-${game.home_score}`
      : game.game_status;
    const winner = game.home_won ? `${game.home_team.team_abbreviation} won` :
                   game.away_won ? `${game.away_team.team_abbreviation} won` :
                   'No winner set';
    console.log(`   Week ${game.week.week_number}: ${matchup} - ${score} - ${winner}`);
  });
  console.log();

  // 6. Find the specific Denver pick
  const denverPick = picks.find(p => p.team_id === denverTeam.id);
  if (denverPick) {
    console.log('6️⃣ Clarissa\'s Denver pick details:');
    console.log(`   Week: ${denverPick.week.week_number}`);
    console.log(`   Team: ${denverPick.team.team_abbreviation}`);
    console.log(`   Team Won: ${denverPick.team_won}`);
    console.log(`   Is Strike: ${denverPick.is_strike}`);
    console.log(`   Pick ID: ${denverPick.id}\n`);

    // Find the game for that week
    const denverGame = games.find(g =>
      g.week.week_number === denverPick.week.week_number &&
      (g.home_team_id === denverTeam.id || g.away_team_id === denverTeam.id)
    );

    if (denverGame) {
      console.log('7️⃣ The game for that week:');
      console.log(`   Matchup: ${denverGame.away_team.team_abbreviation} @ ${denverGame.home_team.team_abbreviation}`);
      console.log(`   Score: ${denverGame.away_score}-${denverGame.home_score}`);
      console.log(`   Status: ${denverGame.game_status}`);
      console.log(`   Home Won: ${denverGame.home_won}`);
      console.log(`   Away Won: ${denverGame.away_won}`);
      console.log(`   ESPN Event ID: ${denverGame.espn_event_id}\n`);

      // Determine if Denver won
      const denverWon = denverGame.home_team_id === denverTeam.id
        ? denverGame.home_won
        : denverGame.away_won;

      console.log('8️⃣ Analysis:');
      console.log(`   Denver should have won: ${denverWon}`);
      console.log(`   Pick shows team_won: ${denverPick.team_won}`);
      console.log(`   Match: ${denverWon === denverPick.team_won ? '✅ YES' : '❌ NO - MISMATCH!'}`);

      if (denverWon !== denverPick.team_won) {
        console.log('\n⚠️  FOUND THE ISSUE!');
        console.log('   The pick was not updated correctly by the trigger.');
        console.log('   Would you like to run the update-pick-results.cjs script to fix it?');
      }
    } else {
      console.log('7️⃣ ❌ No game found for Denver in that week!');
      console.log('   This could mean the game result was never fetched from ESPN.');
    }
  } else {
    console.log('6️⃣ ❌ No Denver pick found for Clarissa!');
  }
}

diagnoseDenverGame().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
