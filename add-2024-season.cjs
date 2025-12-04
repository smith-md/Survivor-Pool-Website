const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function add2024Season() {
  console.log('🏈 Adding 2024 NFL Season Data...\n');

  // Step 1: Add 2024 weeks
  console.log('1️⃣ Adding 2024 weeks...');

  const weeks2024 = [
    { week_number: 1, start_date: '2024-09-05', end_date: '2024-09-09' },
    { week_number: 2, start_date: '2024-09-12', end_date: '2024-09-16' },
    { week_number: 3, start_date: '2024-09-19', end_date: '2024-09-23' },
    { week_number: 4, start_date: '2024-09-26', end_date: '2024-09-30' },
    { week_number: 5, start_date: '2024-10-03', end_date: '2024-10-07' },
    { week_number: 6, start_date: '2024-10-10', end_date: '2024-10-14' },
    { week_number: 7, start_date: '2024-10-17', end_date: '2024-10-21' },
    { week_number: 8, start_date: '2024-10-24', end_date: '2024-10-28' },
    { week_number: 9, start_date: '2024-10-31', end_date: '2024-11-04' },
    { week_number: 10, start_date: '2024-11-07', end_date: '2024-11-11' },
    { week_number: 11, start_date: '2024-11-14', end_date: '2024-11-18' },
    { week_number: 12, start_date: '2024-11-21', end_date: '2024-11-25' },
    { week_number: 13, start_date: '2024-11-28', end_date: '2024-12-02' },
    { week_number: 14, start_date: '2024-12-05', end_date: '2024-12-09' },
    { week_number: 15, start_date: '2024-12-12', end_date: '2024-12-16' },
    { week_number: 16, start_date: '2024-12-19', end_date: '2024-12-23' },
    { week_number: 17, start_date: '2024-12-26', end_date: '2024-12-30' },
    { week_number: 18, start_date: '2025-01-02', end_date: '2025-01-05' },
  ];

  let weeksAdded = 0;
  for (const week of weeks2024) {
    const { error } = await supabase
      .from('weeks')
      .insert({
        season_year: 2024,
        week_number: week.week_number,
        start_date: week.start_date,
        end_date: week.end_date,
        is_complete: true // Mark as complete since 2024 season is over
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

  console.log(`\n✅ Added ${weeksAdded} weeks for 2024 season\n`);

  // Step 2: Import 2024 game results
  console.log('2️⃣ Importing 2024 game results from ESPN...');
  console.log('   This will take a few minutes...\n');

  const { data: weeksData } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_year', 2024)
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
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week.week_number}&dates=2024`
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

  console.log(`\n✅ Imported ${totalGamesImported} games for 2024 season\n`);

  console.log('🎉 2024 season data added successfully!');
  console.log('\n📝 Next step: Run add-2024-sample-players.cjs to add sample players and picks');
}

add2024Season().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
