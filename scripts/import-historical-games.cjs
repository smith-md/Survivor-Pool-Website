const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function fetchESPNGames(year, week) {
  const url = `http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${year}&seasontype=2&week=${week}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error(`Error fetching ESPN data for week ${week}:`, error);
    return [];
  }
}

async function importHistoricalGames() {
  console.log('📥 Importing historical game data from ESPN...\n');

  // Get all weeks and teams
  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_year', 2025)
    .order('week_number');

  if (weeksError) {
    console.error('❌ Error fetching weeks:', weeksError);
    return;
  }

  const { data: teams, error: teamsError } = await supabase
    .from('nfl_teams')
    .select('*');

  if (teamsError) {
    console.error('❌ Error fetching teams:', teamsError);
    return;
  }

  // Create a map of team abbreviations to IDs
  const teamMap = {};
  teams.forEach(team => {
    teamMap[team.team_abbreviation] = team.id;
  });

  let totalImported = 0;
  let totalSkipped = 0;

  // Process weeks 1-14
  for (let weekNum = 1; weekNum <= 14; weekNum++) {
    const week = weeks.find(w => w.week_number === weekNum);
    if (!week) {
      console.log(`⚠️  Week ${weekNum} not found in database`);
      continue;
    }

    console.log(`\n📅 Processing Week ${weekNum}...`);

    // Check if we already have games for this week
    const { data: existingGames } = await supabase
      .from('nfl_games')
      .select('id')
      .eq('week_id', week.id)
      .eq('game_status', 'final');

    if (existingGames && existingGames.length > 0) {
      console.log(`  ℹ️  Already have ${existingGames.length} completed games, skipping...`);
      totalSkipped += existingGames.length;
      continue;
    }

    // Fetch games from ESPN
    const espnGames = await fetchESPNGames(2025, weekNum);

    if (espnGames.length === 0) {
      console.log(`  ⚠️  No games found from ESPN`);
      continue;
    }

    console.log(`  Found ${espnGames.length} games from ESPN`);

    // Process each game
    for (const event of espnGames) {
      try {
        const competition = event.competitions[0];
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

        if (!homeTeam || !awayTeam) {
          console.log(`  ⚠️  Skipping event ${event.id} - missing team data`);
          continue;
        }

        const homeAbbr = homeTeam.team.abbreviation;
        const awayAbbr = awayTeam.team.abbreviation;

        const homeTeamId = teamMap[homeAbbr];
        const awayTeamId = teamMap[awayAbbr];

        if (!homeTeamId || !awayTeamId) {
          console.log(`  ⚠️  Could not find team IDs for ${homeAbbr} vs ${awayAbbr}`);
          continue;
        }

        const homeScore = parseInt(homeTeam.score) || 0;
        const awayScore = parseInt(awayTeam.score) || 0;
        const gameStatus = competition.status.type.completed ? 'final' : 'scheduled';

        // Only import completed games
        if (gameStatus !== 'final') {
          continue;
        }

        const homeWon = homeScore > awayScore;
        const awayWon = awayScore > homeScore;

        // Insert game
        const { error: insertError } = await supabase
          .from('nfl_games')
          .insert({
            week_id: week.id,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_score: homeScore,
            away_score: awayScore,
            home_won: homeWon,
            away_won: awayWon,
            game_status: gameStatus,
            game_date: competition.date,
            espn_event_id: event.id
          });

        if (insertError) {
          // Check if it's a duplicate
          if (insertError.code === '23505') {
            console.log(`  ⏭️  Game already exists: ${homeAbbr} vs ${awayAbbr}`);
          } else {
            console.error(`  ❌ Error inserting game:`, insertError.message);
          }
          continue;
        }

        const result = homeWon ? `${homeAbbr} ${homeScore}-${awayScore}` : `${awayAbbr} ${awayScore}-${homeScore}`;
        console.log(`  ✅ Imported: ${result}`);
        totalImported++;

      } catch (error) {
        console.error(`  ❌ Error processing game:`, error.message);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n\n📊 Import Summary:`);
  console.log(`  ✅ Imported: ${totalImported} games`);
  console.log(`  ⏭️  Skipped: ${totalSkipped} games (already existed)`);
  console.log(`\nNow run: node update-pick-results.cjs to update all picks with these results!`);
}

importHistoricalGames().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
