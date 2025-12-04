const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkColbyAllPicks() {
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

  // Process each Colby
  for (const colby of colbys) {
    const name = colby.name || `${colby.first_name} ${colby.last_name || ''}`;
    console.log('\n' + '='.repeat(70));
    console.log(`\n${name} - Season ${colby.season_year}`);
    console.log('Strikes:', colby.strikes, '| Eliminated:', colby.is_eliminated);

    // Get all picks
    const { data: picks, error: picksError } = await supabase
      .from('picks')
      .select(`
        *,
        week:weeks(week_number, season_year),
        team:nfl_teams(team_abbreviation, team_name)
      `)
      .eq('player_id', colby.id)
      .order('week(week_number)');

    if (picksError) {
      console.log('  Error fetching picks:', picksError);
      continue;
    }

    console.log('\nAll Picks:');
    console.log('Week'.padEnd(6), 'Team'.padEnd(25), 'Result'.padEnd(10), 'Strike');
    console.log('='.repeat(60));

    let denverPick = null;
    picks.forEach(pick => {
      const weekNum = `W${pick.week.week_number}`;
      const teamName = pick.team?.team_name || 'Unknown';
      const teamAbbr = pick.team?.team_abbreviation || '';
      const result = pick.team_won === null ? 'Pending' : (pick.team_won ? 'Won ✓' : 'Lost ✗');
      const strike = pick.is_strike ? 'Yes' : 'No';

      const display = `${weekNum.padEnd(6)} ${teamName.padEnd(25)} ${result.padEnd(10)} ${strike}`;
      console.log(display);

      // Check if this is Denver
      if (teamAbbr === 'DEN') {
        denverPick = { ...pick, weekNum };
      }
    });

    if (denverPick) {
      console.log('\n🔍 FOUND DENVER PICK!');
      console.log('  Week:', denverPick.weekNum);
      console.log('  Team Won:', denverPick.team_won);
      console.log('  Is Strike:', denverPick.is_strike);
      console.log('  Pick ID:', denverPick.id);

      // Get the actual game result for this week
      const { data: week, error: weekError } = await supabase
        .from('weeks')
        .select('*')
        .eq('season_year', colby.season_year)
        .eq('week_number', denverPick.week.week_number)
        .single();

      if (!weekError) {
        const { data: denverTeam } = await supabase
          .from('nfl_teams')
          .select('id')
          .eq('team_abbreviation', 'DEN')
          .single();

        const { data: games } = await supabase
          .from('nfl_games')
          .select(`
            *,
            home_team:nfl_teams!nfl_games_home_team_id_fkey(team_abbreviation),
            away_team:nfl_teams!nfl_games_away_team_id_fkey(team_abbreviation)
          `)
          .eq('week_id', week.id)
          .or(`home_team_id.eq.${denverTeam.id},away_team_id.eq.${denverTeam.id}`);

        if (games && games.length > 0) {
          const game = games[0];
          const denverWasHome = game.home_team.team_abbreviation === 'DEN';
          const denverWon = denverWasHome ? game.home_won : game.away_won;

          console.log('\n  📊 Game Details:');
          console.log('    Matchup:', `${game.away_team.team_abbreviation} @ ${game.home_team.team_abbreviation}`);
          console.log('    Score:', `${game.away_score} - ${game.home_score}`);
          console.log('    Denver Actually Won:', denverWon ? 'Yes ✓' : 'No ✗');
          console.log('    Pick Shows Won:', denverPick.team_won ? 'Yes ✓' : 'No ✗');

          if (denverPick.team_won !== denverWon) {
            console.log('\n  ❌ MISMATCH FOUND!');
            console.log('    This pick needs to be fixed.');
          } else {
            console.log('\n  ✓ Pick result matches game result.');
          }
        }
      }
    } else {
      console.log('\nNo Denver pick found for this player.');
    }
  }
}

checkColbyAllPicks().catch(console.error);
