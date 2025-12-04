const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function investigateColbyDenver() {
  // Find all Colby S records
  const { data: colbys, error: colbyError } = await supabase
    .from('players')
    .select('*')
    .or('name.ilike.%Colby S%,first_name.ilike.Colby')
    .order('season_year', { ascending: false });

  if (colbyError) {
    console.error('Error finding Colby:', colbyError);
    return;
  }

  console.log('\n📋 Found Colby S Records:');
  colbys.forEach((c, i) => {
    const name = c.name || `${c.first_name} ${c.last_name || ''}`;
    console.log(`  ${i + 1}. ${name} - Season ${c.season_year} (ID: ${c.id})`);
  });

  // Process each Colby
  for (const colby of colbys) {
    const name = colby.name || `${colby.first_name} ${colby.last_name || ''}`;
    console.log('\n' + '='.repeat(70));
    console.log(`\n📋 ${name} - Season ${colby.season_year}`);
    console.log('Strikes:', colby.strikes);

    // Get Week 13 for the season
    const { data: week13, error: weekError } = await supabase
      .from('weeks')
      .select('*')
      .eq('season_year', colby.season_year)
      .eq('week_number', 13)
      .single();

    if (weekError) {
      console.log('  ⚠️  No Week 13 found for this season');
      continue;
    }

    // Get Colby's Week 13 pick
    const { data: pick, error: pickError } = await supabase
      .from('picks')
      .select(`
        *,
        team:nfl_teams(id, team_abbreviation, team_name)
      `)
      .eq('player_id', colby.id)
      .eq('week_id', week13.id)
      .single();

    if (pickError) {
      console.log('  ⚠️  No Week 13 pick found');
      continue;
    }

    console.log('\n🎯 Week 13 Pick:');
    console.log('  Team:', pick.team.team_name, `(${pick.team.team_abbreviation})`);
    console.log('  Shown as Won:', pick.team_won);
    console.log('  Is Strike:', pick.is_strike);

    // Check if it's Denver
    if (pick.team.team_abbreviation !== 'DEN') {
      console.log('  ℹ️  Not Denver - skipping');
      continue;
    }

    console.log('  ✓ This is the Denver pick!');

    // Find Denver's Week 13 game
    const { data: games, error: gamesError } = await supabase
      .from('nfl_games')
      .select(`
        *,
        home_team:nfl_teams!nfl_games_home_team_id_fkey(id, team_abbreviation, team_name),
        away_team:nfl_teams!nfl_games_away_team_id_fkey(id, team_abbreviation, team_name)
      `)
      .eq('week_id', week13.id)
      .or(`home_team_id.eq.${pick.team.id},away_team_id.eq.${pick.team.id}`);

    if (gamesError || games.length === 0) {
      console.log('  ⚠️  No game found for Denver in Week 13');
      continue;
    }

    const game = games[0];
    console.log('\n🎮 Denver\'s Week 13 Game:');
    console.log('  Matchup:', `${game.away_team.team_abbreviation} @ ${game.home_team.team_abbreviation}`);
    console.log('  Score:', `${game.away_score} - ${game.home_score}`);
    console.log('  Status:', game.game_status);

    const denverWasHome = game.home_team.id === pick.team.id;
    const denverWon = denverWasHome ? game.home_won : game.away_won;

    console.log('  Denver Won:', denverWon ? 'Yes ✓' : 'No ✗');

    console.log('\n🔍 ISSUE ANALYSIS:');
    console.log('  Pick shows as won:', pick.team_won);
    console.log('  Actual result:', denverWon ? 'Won' : 'Lost');

    if (pick.team_won !== denverWon) {
      console.log('\n  ❌ MISMATCH! The pick result is INCORRECT.');
      console.log('  Should update:');
      console.log('    - team_won: false');
      console.log('    - is_strike: true');
      console.log('  Pick ID to fix:', pick.id);
    } else {
      console.log('\n  ✓ Pick result is correct.');
    }
  }
}

investigateColbyDenver().catch(console.error);
