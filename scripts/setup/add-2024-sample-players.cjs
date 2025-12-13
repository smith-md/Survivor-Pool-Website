const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function add2024SamplePlayers() {
  console.log('👥 Adding 2024 Sample Players and Picks...\n');

  // Sample player names
  const samplePlayers = [
    { first_name: 'Mike', last_name: 'Johnson' },
    { first_name: 'Sarah', last_name: 'Williams' },
    { first_name: 'David', last_name: 'Brown' },
    { first_name: 'Emily', last_name: 'Davis' },
    { first_name: 'James', last_name: 'Miller' },
    { first_name: 'Lisa', last_name: 'Wilson' },
    { first_name: 'Robert', last_name: 'Moore' },
    { first_name: 'Jennifer', last_name: 'Taylor' },
    { first_name: 'William', last_name: 'Anderson' },
    { first_name: 'Amanda', last_name: 'Thomas' },
  ];

  // Step 1: Add players
  console.log('1️⃣ Adding 2024 players...\n');

  const playerIds = [];

  for (const player of samplePlayers) {
    const { data, error} = await supabase
      .from('players')
      .insert({
        season_year: 2024,
        name: `${player.first_name} ${player.last_name}`,
        first_name: player.first_name,
        last_name: player.last_name,
        entry_fee_paid: true,
        strikes: 0,
        is_active: false,
        is_eliminated: false,
        has_bought_back: false
      })
      .select();

    if (error) {
      console.error(`  ❌ Error adding ${player.first_name} ${player.last_name}:`, error.message);
    } else {
      console.log(`  ✅ Added ${player.first_name} ${player.last_name}`);
      playerIds.push({ id: data[0].id, name: `${player.first_name} ${player.last_name}` });
    }
  }

  console.log(`\n✅ Added ${playerIds.length} players\n`);

  // Step 2: Get weeks and teams
  console.log('2️⃣ Fetching 2024 weeks and teams...\n');

  const { data: weeks } = await supabase
    .from('weeks')
    .select('*')
    .eq('season_year', 2024)
    .order('week_number');

  const { data: teams } = await supabase
    .from('nfl_teams')
    .select('*');

  console.log(`  Found ${weeks.length} weeks and ${teams.length} teams\n`);

  // Step 3: Create picks for each player
  console.log('3️⃣ Creating picks (this simulates a full season)...\n');

  // Get all games to make realistic picks
  const weekIds = weeks.map(w => w.id);
  const { data: allGames } = await supabase
    .from('nfl_games')
    .select('*')
    .in('week_id', weekIds)
    .eq('game_status', 'final');

  // Organize games by week
  const gamesByWeek = {};
  allGames.forEach(game => {
    const week = weeks.find(w => w.id === game.week_id);
    if (!gamesByWeek[week.week_number]) {
      gamesByWeek[week.week_number] = [];
    }
    gamesByWeek[week.week_number].push(game);
  });

  let totalPicks = 0;

  for (const player of playerIds) {
    const usedTeams = new Set();
    let playerStrikes = 0;
    let playerActive = true;

    console.log(`  ${player.name}:`);

    // Each player makes picks for all 18 weeks
    for (const week of weeks) {
      if (!playerActive) break; // Stop if player is eliminated

      const weekGames = gamesByWeek[week.week_number] || [];
      if (weekGames.length === 0) continue;

      // Find available games (teams not yet used)
      const availableGames = weekGames.filter(game =>
        !usedTeams.has(game.home_team_id) && !usedTeams.has(game.away_team_id)
      );

      if (availableGames.length === 0) continue;

      // Pick a random game
      const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];

      // Randomly choose home or away team
      const pickHome = Math.random() > 0.5;
      const pickedTeamId = pickHome ? randomGame.home_team_id : randomGame.away_team_id;
      const teamWon = pickHome ? randomGame.home_won : randomGame.away_won;
      const isStrike = !teamWon;

      usedTeams.add(pickedTeamId);

      // Create the pick
      const { error } = await supabase
        .from('picks')
        .insert({
          player_id: player.id,
          week_id: week.id,
          team_id: pickedTeamId,
          team_won: teamWon,
          is_strike: isStrike
        });

      if (error) {
        console.log(`    ❌ Week ${week.week_number}: Error - ${error.message}`);
      } else {
        if (isStrike) {
          playerStrikes++;
          console.log(`    ❌ Week ${week.week_number}: LOSS (Strike ${playerStrikes})`);

          // Eliminate if 2 strikes
          if (playerStrikes >= 2) {
            playerActive = false;
            console.log(`    💀 ELIMINATED after Week ${week.week_number}`);
          }
        } else {
          console.log(`    ✅ Week ${week.week_number}: WIN`);
        }
        totalPicks++;
      }
    }

    // Update player's final status
    await supabase
      .from('players')
      .update({
        strikes: playerStrikes,
        is_eliminated: playerStrikes >= 2,
        is_active: playerActive
      })
      .eq('id', player.id);

    console.log(`    Final: ${playerStrikes} strikes, ${playerActive ? 'Survived' : 'Eliminated'}\n`);
  }

  console.log(`\n✅ Created ${totalPicks} picks for 2024 season`);
  console.log('\n🎉 2024 sample players and picks added successfully!');
  console.log('\n📺 Visit http://localhost:5173/archive to see the 2024 season!');
}

add2024SamplePlayers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
