const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkJaylenWeek14() {
  console.log('🔍 Checking Jaylen Week 14 TB pick\n');

  // Get Jaylen
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .ilike('first_name', 'jaylen')
    .single();

  console.log(`Player: ${player.first_name} ${player.last_name}`);
  console.log(`Current strikes: ${player.strikes}`);
  console.log(`Eliminated: ${player.is_eliminated}\n`);

  // Get Week 14
  const { data: week14 } = await supabase
    .from('weeks')
    .select('*')
    .eq('week_number', 14)
    .eq('season_year', 2025)
    .single();

  console.log(`Week 14 ID: ${week14.id}`);
  console.log(`Week 14 dates: ${week14.start_date} to ${week14.end_date}\n`);

  // Get Jaylen's Week 14 pick
  const { data: pick } = await supabase
    .from('picks')
    .select(`
      *,
      team:nfl_teams(team_abbreviation, team_name)
    `)
    .eq('player_id', player.id)
    .eq('week_id', week14.id)
    .single();

  console.log('Week 14 Pick:');
  console.log(`  Team: ${pick.team.team_abbreviation} (${pick.team.team_name})`);
  console.log(`  team_won: ${pick.team_won}`);
  console.log(`  is_strike: ${pick.is_strike}`);
  console.log(`  Pick created: ${pick.created_at}`);
  console.log(`  Pick updated: ${pick.updated_at}\n`);

  // Get TB team ID
  const { data: tbTeam } = await supabase
    .from('nfl_teams')
    .select('*')
    .eq('team_abbreviation', 'TB')
    .single();

  console.log(`TB Team ID: ${tbTeam.id}\n`);

  // Find TB game in Week 14
  const { data: tbGames } = await supabase
    .from('nfl_games')
    .select(`
      *,
      home_team:nfl_teams!nfl_games_home_team_id_fkey(team_abbreviation, team_name),
      away_team:nfl_teams!nfl_games_away_team_id_fkey(team_abbreviation, team_name)
    `)
    .eq('week_id', week14.id)
    .or(`home_team_id.eq.${tbTeam.id},away_team_id.eq.${tbTeam.id}`);

  console.log(`TB games in Week 14: ${tbGames?.length || 0}`);

  if (!tbGames || tbGames.length === 0) {
    console.log('❌ NO TB GAME FOUND IN WEEK 14!');
    console.log('\nThis is why the pick is not marked as a strike.');
    console.log('The database trigger cannot update picks if there is no game data.');
    console.log('\nAction needed: Fetch Week 14 games from ESPN');
  } else {
    const game = tbGames[0];
    console.log(`\n✅ TB Game found:`);
    console.log(`  Matchup: ${game.away_team.team_abbreviation} @ ${game.home_team.team_abbreviation}`);
    console.log(`  Score: ${game.away_score}-${game.home_score}`);
    console.log(`  Status: ${game.game_status}`);
    console.log(`  Home won: ${game.home_won}`);
    console.log(`  Away won: ${game.away_won}`);
    console.log(`  Game date: ${game.game_date}`);
    console.log(`  ESPN Event ID: ${game.espn_event_id}\n`);

    // Determine if TB won
    let tbWon = null;
    if (game.home_team_id === tbTeam.id) {
      tbWon = game.home_won;
      console.log(`TB was HOME team. TB won: ${tbWon}`);
    } else {
      tbWon = game.away_won;
      console.log(`TB was AWAY team. TB won: ${tbWon}`);
    }

    if (game.game_status !== 'final') {
      console.log(`\n⚠️  Game status is "${game.game_status}" (not final)`);
      console.log('The trigger only updates picks for final games.');
    } else if (tbWon === null) {
      console.log(`\n⚠️  Game is final but winner not set (home_won=${game.home_won}, away_won=${game.away_won})`);
      console.log('This is a data issue - final games should have winners set.');
    } else {
      console.log(`\nExpected pick values if trigger fired:`);
      console.log(`  team_won should be: ${tbWon}`);
      console.log(`  is_strike should be: ${!tbWon}`);

      if (pick.team_won === null) {
        console.log(`\n❌ TRIGGER DID NOT FIRE`);
        console.log('The pick was not updated even though the game is final.');
      } else if (pick.team_won === tbWon && pick.is_strike === !tbWon) {
        console.log(`\n✅ PICK IS CORRECT`);
      } else {
        console.log(`\n❌ PICK HAS WRONG VALUES`);
      }
    }
  }
}

checkJaylenWeek14();
