const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingGames() {
  console.log('🔍 Checking for Missing Game Data\n');
  console.log('Analyzing all weeks for 2025 season...\n');

  // Get all weeks
  const { data: weeks } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_year', 2025)
    .order('week_number');

  if (!weeks || weeks.length === 0) {
    console.log('❌ No weeks found for 2025 season');
    return;
  }

  console.log(`Found ${weeks.length} weeks in database\n`);
  console.log('='.repeat(80));

  const issues = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const week of weeks) {
    const weekStart = new Date(week.start_date);
    const weekEnd = new Date(week.end_date);
    const hasStarted = today >= weekStart;
    const hasEnded = today > weekEnd;

    // Get all games for this week
    const { data: games } = await supabase
      .from('nfl_games')
      .select(`
        id,
        espn_event_id,
        game_status,
        home_won,
        away_won,
        home_team:nfl_teams!nfl_games_home_team_id_fkey(team_abbreviation),
        away_team:nfl_teams!nfl_games_away_team_id_fkey(team_abbreviation)
      `)
      .eq('week_id', week.id);

    const gameCount = games?.length || 0;
    const finalGames = games?.filter(g => g.game_status === 'final') || [];
    const inProgressGames = games?.filter(g => g.game_status === 'in_progress') || [];
    const scheduledGames = games?.filter(g => g.game_status === 'scheduled') || [];

    // Check for games without winners set
    const finalGamesWithoutWinners = finalGames.filter(g =>
      g.home_won === null || g.away_won === null
    );

    console.log(`Week ${week.week_number} (${week.start_date} to ${week.end_date})`);
    console.log(`  Status: ${hasEnded ? 'Completed' : hasStarted ? 'In Progress' : 'Upcoming'}`);
    console.log(`  Total games: ${gameCount}`);
    console.log(`    - Final: ${finalGames.length}`);
    console.log(`    - In Progress: ${inProgressGames.length}`);
    console.log(`    - Scheduled: ${scheduledGames.length}`);

    // Flag potential issues
    if (hasEnded && gameCount < 14) {
      console.log(`  ⚠️  WARNING: Week has ended but only ${gameCount} games (expected 14-16)`);
      issues.push({
        week: week.week_number,
        issue: `Only ${gameCount} games found (expected 14-16)`,
        severity: 'high'
      });
    } else if (hasEnded && gameCount >= 14 && gameCount <= 16) {
      console.log(`  ✅ Game count looks normal`);
    }

    if (hasEnded && finalGames.length < gameCount) {
      const notFinal = gameCount - finalGames.length;
      console.log(`  ⚠️  WARNING: ${notFinal} games not marked as final yet`);
      issues.push({
        week: week.week_number,
        issue: `${notFinal} games not marked final`,
        severity: 'medium'
      });
    }

    if (finalGamesWithoutWinners.length > 0) {
      console.log(`  ❌ ERROR: ${finalGamesWithoutWinners.length} final games missing winner data`);
      finalGamesWithoutWinners.forEach(g => {
        console.log(`     - ${g.away_team.team_abbreviation} @ ${g.home_team.team_abbreviation}`);
      });
      issues.push({
        week: week.week_number,
        issue: `${finalGamesWithoutWinners.length} final games missing winners`,
        severity: 'critical'
      });
    }

    // Show game details for weeks with low counts
    if (gameCount > 0 && gameCount < 14 && hasStarted) {
      console.log(`  Games found:`);
      games.forEach(g => {
        console.log(`     - ${g.away_team.team_abbreviation} @ ${g.home_team.team_abbreviation} (${g.game_status})`);
      });

      // Count unique teams
      const teams = new Set();
      games.forEach(g => {
        teams.add(g.home_team.team_abbreviation);
        teams.add(g.away_team.team_abbreviation);
      });
      console.log(`  Unique teams: ${teams.size} (expected ~28-32)`);
    }

    console.log('-'.repeat(80));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('✅ No missing game data found!');
    console.log('All weeks have appropriate game counts and data.');
  } else {
    console.log(`⚠️  Found ${issues.length} potential issues:\n`);

    const critical = issues.filter(i => i.severity === 'critical');
    const high = issues.filter(i => i.severity === 'high');
    const medium = issues.filter(i => i.severity === 'medium');

    if (critical.length > 0) {
      console.log('🚨 CRITICAL (needs immediate attention):');
      critical.forEach(i => console.log(`   Week ${i.week}: ${i.issue}`));
      console.log('');
    }

    if (high.length > 0) {
      console.log('⚠️  HIGH (likely missing data):');
      high.forEach(i => console.log(`   Week ${i.week}: ${i.issue}`));
      console.log('');
    }

    if (medium.length > 0) {
      console.log('ℹ️  MEDIUM (may be in progress):');
      medium.forEach(i => console.log(`   Week ${i.week}: ${i.issue}`));
      console.log('');
    }

    console.log('\nRECOMMENDED ACTIONS:');
    console.log('1. For critical/high issues: Re-fetch game data from ESPN');
    console.log('   curl -X POST "https://your-project.supabase.co/functions/v1/update-nfl-results?week=X"');
    console.log('');
    console.log('2. For medium issues: Wait if games are still in progress, or re-fetch if week has ended');
    console.log('');
    console.log('3. After fetching: Run "node test-trigger.cjs" to verify picks updated');
  }

  console.log('='.repeat(80));

  // Return weeks with issues for potential batch fix
  return issues;
}

checkMissingGames();
