const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function add2023Season() {
  console.log('🏈 Adding 2023 NFL Season Data...\n');

  // Step 1: Add 2023 weeks
  console.log('1️⃣ Adding 2023 weeks...');

  const weeks2023 = [
    { week_number: 1, start_date: '2023-09-07', end_date: '2023-09-11' },
    { week_number: 2, start_date: '2023-09-14', end_date: '2023-09-18' },
    { week_number: 3, start_date: '2023-09-21', end_date: '2023-09-25' },
    { week_number: 4, start_date: '2023-09-28', end_date: '2023-10-02' },
    { week_number: 5, start_date: '2023-10-05', end_date: '2023-10-09' },
    { week_number: 6, start_date: '2023-10-12', end_date: '2023-10-16' },
    { week_number: 7, start_date: '2023-10-19', end_date: '2023-10-23' },
    { week_number: 8, start_date: '2023-10-26', end_date: '2023-10-30' },
    { week_number: 9, start_date: '2023-11-02', end_date: '2023-11-06' },
    { week_number: 10, start_date: '2023-11-09', end_date: '2023-11-13' },
    { week_number: 11, start_date: '2023-11-16', end_date: '2023-11-20' },
    { week_number: 12, start_date: '2023-11-23', end_date: '2023-11-27' },
    { week_number: 13, start_date: '2023-11-30', end_date: '2023-12-04' },
    { week_number: 14, start_date: '2023-12-07', end_date: '2023-12-11' },
    { week_number: 15, start_date: '2023-12-14', end_date: '2023-12-18' },
    { week_number: 16, start_date: '2023-12-21', end_date: '2023-12-25' },
    { week_number: 17, start_date: '2023-12-28', end_date: '2024-01-01' },
    { week_number: 18, start_date: '2024-01-04', end_date: '2024-01-07' },
  ];

  let weeksAdded = 0;
  for (const week of weeks2023) {
    const { error } = await supabase
      .from('weeks')
      .insert({
        season_year: 2023,
        week_number: week.week_number,
        start_date: week.start_date,
        end_date: week.end_date,
        is_complete: true // Mark as complete since 2023 season is over
      });

    if (error) {
      if (error.code === '23505') {
        console.log(`  ⏭️  Week ${week.week_number} already exists`);
      } else {
        console.error(`  ❌ Error adding week ${week.week_number}:`, error.message);
      }
    } else {
      console.log(`  ✅ Added Week ${week.week_number}`);
      weeksAdded++;
    }
  }

  console.log(`\n✅ Added ${weeksAdded} weeks for 2023 season\n`);

  // Step 2: Import 2023 game results
  console.log('2️⃣ Importing 2023 game results from ESPN...');
  console.log('   This will take a few minutes...\n');

  const { data: weeksData } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_year', 2023)
    .order('week_number');

  const { data: teams } = await supabase
    .from('nfl_teams')
    .select('*');

  const teamMap = {};
  teams.forEach(team => {
    teamMap[team.team_abbreviation] = team.id;
  });

  let totalGamesImported = 0;

  for (const week of weeksData) {
    console.log(`   Fetching Week ${week.week_number}...`);

    try {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week.week_number}&dates=2023`
      );
      const data = await response.json();
      const events = data.events || [];

      let weekGames = 0;

      for (const event of events) {
        const comp = event.competitions?.[0];
        if (!comp) continue;

        const homeTeam = comp.competitors?.find(c => c.homeAway === 'home');
        const awayTeam = comp.competitors?.find(c => c.homeAway === 'away');

        if (!homeTeam || !awayTeam) continue;

        const homeAbbr = homeTeam.team.abbreviation;
        const awayAbbr = awayTeam.team.abbreviation;

        const homeTeamId = teamMap[homeAbbr];
        const awayTeamId = teamMap[awayAbbr];

        if (!homeTeamId || !awayTeamId) {
          console.log(`     ⚠️  Team not found: ${homeAbbr} or ${awayAbbr}`);
          continue;
        }

        const isCompleted = comp.status?.type?.completed || false;
        if (!isCompleted) continue; // Only import completed games

        const homeScore = parseInt(homeTeam.score || '0');
        const awayScore = parseInt(awayTeam.score || '0');
        const homeWon = homeScore > awayScore;
        const awayWon = awayScore > homeScore;

        const { error } = await supabase
          .from('nfl_games')
          .insert({
            week_id: week.id,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_score: homeScore,
            away_score: awayScore,
            home_won: homeWon,
            away_won: awayWon,
            game_status: 'final',
            game_date: event.date,
            espn_event_id: event.id
          });

        if (error) {
          if (error.code !== '23505') { // Ignore duplicates
            console.log(`     ❌ Error: ${error.message}`);
          }
        } else {
          weekGames++;
        }
      }

      console.log(`     ✅ Imported ${weekGames} games`);
      totalGamesImported += weekGames;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`     ❌ Error fetching week ${week.week_number}:`, error.message);
    }
  }

  console.log(`\n✅ Imported ${totalGamesImported} games for 2023 season\n`);

  console.log('🎉 2023 season data added successfully!');
  console.log('\n📝 Next step: Run import-2023-picks-from-csv.cjs to import player data');
}

add2023Season().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
