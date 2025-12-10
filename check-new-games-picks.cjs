const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkNewGamesPicks() {
  console.log('🔍 Checking if picks were updated for newly added games\n');

  const newGames = [
    { week: 5, teams: ['SF', 'LAR'] },
    { week: 5, teams: ['WSH', 'LAC'] },
    { week: 5, teams: ['NE', 'BUF'] },
    { week: 8, teams: ['NYJ', 'CIN'] }
  ];

  for (const gameInfo of newGames) {
    const { data: week } = await supabase
      .from('weeks')
      .select('id')
      .eq('week_number', gameInfo.week)
      .eq('season_year', 2025)
      .single();

    console.log(`\n📊 Week ${gameInfo.week}: ${gameInfo.teams.join(' vs ')}`);

    for (const teamAbbr of gameInfo.teams) {
      // Get team ID
      const { data: team } = await supabase
        .from('nfl_teams')
        .select('id')
        .eq('team_abbreviation', teamAbbr)
        .single();

      if (!team) {
        console.log(`   ❌ Team ${teamAbbr} not found in database`);
        continue;
      }

      // Get picks for this team/week
      const { data: picks } = await supabase
        .from('picks')
        .select(`
          id,
          team_won,
          is_strike,
          player:players(first_name, last_name)
        `)
        .eq('week_id', week.id)
        .eq('team_id', team.id);

      if (!picks || picks.length === 0) {
        console.log(`   ${teamAbbr}: No players picked this team`);
        continue;
      }

      const updated = picks.filter(p => p.team_won !== null).length;
      const pending = picks.length - updated;

      console.log(`   ${teamAbbr}: ${picks.length} pick(s)`);
      picks.forEach(p => {
        const playerName = `${p.player.first_name} ${p.player.last_name}`;
        if (p.team_won !== null) {
          const result = p.team_won ? 'WIN' : 'LOSS';
          console.log(`      ✅ ${playerName}: ${result} (is_strike=${p.is_strike})`);
        } else {
          console.log(`      ⚠️  ${playerName}: NOT UPDATED (team_won=null)`);
        }
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('If any picks show "NOT UPDATED", run:');
  console.log('  node update-pick-results.cjs');
  console.log('='.repeat(60));
}

checkNewGamesPicks();
