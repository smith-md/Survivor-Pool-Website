const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function testTrigger() {
  console.log('🧪 Testing Database Trigger Behavior\n');
  console.log('This will check if picks are being updated when games are marked final.\n');

  // Get a recent final game
  const { data: finalGames } = await supabase
    .from('nfl_games')
    .select(`
      id,
      espn_event_id,
      week_id,
      home_team_id,
      away_team_id,
      game_status,
      home_score,
      away_score,
      home_won,
      away_won,
      updated_at,
      week:weeks(week_number),
      home_team:nfl_teams!nfl_games_home_team_id_fkey(team_abbreviation),
      away_team:nfl_teams!nfl_games_away_team_id_fkey(team_abbreviation)
    `)
    .eq('game_status', 'final')
    .not('home_won', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (!finalGames || finalGames.length === 0) {
    console.log('❌ No final games found to test against');
    return;
  }

  console.log(`Found ${finalGames.length} recent final games. Checking picks...\n`);

  for (const game of finalGames) {
    const matchup = `${game.away_team.team_abbreviation} @ ${game.home_team.team_abbreviation}`;
    console.log(`\n📊 Game: ${matchup} (Week ${game.week.week_number})`);
    console.log(`   Score: ${game.away_score}-${game.home_score}`);
    console.log(`   Winner: ${game.home_won ? game.home_team.team_abbreviation : game.away_team.team_abbreviation}`);
    console.log(`   Game marked final at: ${new Date(game.updated_at).toLocaleString()}`);

    // Get all picks for home team
    const { data: homePicks } = await supabase
      .from('picks')
      .select(`
        id,
        team_won,
        is_strike,
        updated_at,
        player:players(first_name, last_name)
      `)
      .eq('week_id', game.week_id)
      .eq('team_id', game.home_team_id);

    // Get all picks for away team
    const { data: awayPicks } = await supabase
      .from('picks')
      .select(`
        id,
        team_won,
        is_strike,
        updated_at,
        player:players(first_name, last_name)
      `)
      .eq('week_id', game.week_id)
      .eq('team_id', game.away_team_id);

    const allPicks = [...(homePicks || []), ...(awayPicks || [])];

    if (allPicks.length === 0) {
      console.log(`   ℹ️  No players picked either team`);
      continue;
    }

    const updatedPicks = allPicks.filter(p => p.team_won !== null);
    const pendingPicks = allPicks.filter(p => p.team_won === null);

    console.log(`\n   Picks for this game:`);
    console.log(`   Total: ${allPicks.length}`);
    console.log(`   ✅ Updated (team_won set): ${updatedPicks.length}`);
    console.log(`   ⏳ Pending (team_won null): ${pendingPicks.length}`);

    if (pendingPicks.length > 0) {
      console.log(`\n   ⚠️  WARNING: ${pendingPicks.length} picks NOT updated by trigger:`);
      pendingPicks.forEach(p => {
        const playerName = p.player ? `${p.player.first_name} ${p.player.last_name}` : 'Unknown';
        console.log(`      - ${playerName}: team_won=${p.team_won}, is_strike=${p.is_strike}`);
      });
    }

    if (updatedPicks.length > 0) {
      console.log(`\n   ✅ Updated picks:`);
      updatedPicks.forEach(p => {
        const playerName = p.player ? `${p.player.first_name} ${p.player.last_name}` : 'Unknown';
        const result = p.team_won ? 'WIN' : 'LOSS';
        console.log(`      - ${playerName}: ${result} (is_strike=${p.is_strike})`);
      });
    }

    // Verify correctness
    const homePicksUpdated = homePicks?.filter(p => p.team_won !== null) || [];
    const awayPicksUpdated = awayPicks?.filter(p => p.team_won !== null) || [];

    let errors = 0;
    homePicksUpdated.forEach(p => {
      if (p.team_won !== game.home_won) {
        console.log(`\n   ❌ ERROR: Pick has wrong team_won value (expected ${game.home_won}, got ${p.team_won})`);
        errors++;
      }
      if (p.is_strike !== !game.home_won) {
        console.log(`\n   ❌ ERROR: Pick has wrong is_strike value (expected ${!game.home_won}, got ${p.is_strike})`);
        errors++;
      }
    });

    awayPicksUpdated.forEach(p => {
      if (p.team_won !== game.away_won) {
        console.log(`\n   ❌ ERROR: Pick has wrong team_won value (expected ${game.away_won}, got ${p.team_won})`);
        errors++;
      }
      if (p.is_strike !== !game.away_won) {
        console.log(`\n   ❌ ERROR: Pick has wrong is_strike value (expected ${!game.away_won}, got ${p.is_strike})`);
        errors++;
      }
    });

    if (errors === 0 && updatedPicks.length === allPicks.length && allPicks.length > 0) {
      console.log(`\n   ✅ TRIGGER WORKING CORRECTLY for this game`);
    } else if (errors === 0 && updatedPicks.length < allPicks.length) {
      console.log(`\n   ⚠️  TRIGGER PARTIALLY WORKING (some picks not updated)`);
    } else if (errors > 0) {
      console.log(`\n   ❌ TRIGGER HAS ERRORS (${errors} incorrect values)`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('- If all picks show "Updated" with correct values → Trigger is working');
  console.log('- If picks show "Pending" (team_won null) → Trigger may not be firing');
  console.log('- If picks have wrong values → Trigger logic has bugs');
  console.log('='.repeat(60));
}

testTrigger();
