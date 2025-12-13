const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkTeamMismatches() {
  console.log('🔍 Checking for team abbreviation mismatches with ESPN...\n');

  // Get all teams from database
  const { data: teams } = await supabase
    .from('nfl_teams')
    .select('*')
    .order('team_abbreviation');

  console.log('Database teams:\n');
  teams.forEach(team => {
    console.log(`  ${team.team_abbreviation.padEnd(4, ' ')} - ${team.team_name}`);
  });

  // Check ESPN's current abbreviations by fetching a recent week
  console.log('\n\n🏈 Checking ESPN abbreviations...\n');

  const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=13&dates=2025');
  const data = await response.json();

  // Extract all unique team abbreviations from ESPN
  const espnTeams = new Map();

  data.events?.forEach(event => {
    const comp = event.competitions?.[0];
    if (comp?.competitors) {
      comp.competitors.forEach(competitor => {
        const abbr = competitor.team.abbreviation;
        const name = competitor.team.displayName;
        espnTeams.set(abbr, name);
      });
    }
  });

  console.log('ESPN teams:\n');
  Array.from(espnTeams.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([abbr, name]) => {
      console.log(`  ${abbr.padEnd(4, ' ')} - ${name}`);
    });

  // Compare and find mismatches
  console.log('\n\n⚠️  MISMATCHES FOUND:\n');

  const dbAbbrSet = new Set(teams.map(t => t.team_abbreviation));
  const espnAbbrSet = new Set(espnTeams.keys());

  // Find teams in ESPN but not in DB
  const missingInDB = [];
  espnAbbrSet.forEach(abbr => {
    if (!dbAbbrSet.has(abbr)) {
      missingInDB.push({ espn: abbr, name: espnTeams.get(abbr) });
    }
  });

  // Find teams in DB but not in ESPN
  const missingInESPN = [];
  teams.forEach(team => {
    if (!espnAbbrSet.has(team.team_abbreviation)) {
      missingInESPN.push({ db: team.team_abbreviation, name: team.team_name });
    }
  });

  if (missingInDB.length > 0) {
    console.log('Teams in ESPN but NOT in database:');
    missingInDB.forEach(t => {
      console.log(`  ${t.espn} - ${t.name}`);
    });
    console.log();
  }

  if (missingInESPN.length > 0) {
    console.log('Teams in database but NOT in ESPN:');
    missingInESPN.forEach(t => {
      console.log(`  ${t.db} - ${t.name}`);
    });
    console.log();
  }

  // Try to find likely matches
  console.log('\n💡 SUGGESTED UPDATES:\n');

  const updates = [];

  missingInESPN.forEach(dbTeam => {
    missingInDB.forEach(espnTeam => {
      // Check if team names are similar
      if (dbTeam.name.toLowerCase().includes(espnTeam.name.toLowerCase()) ||
          espnTeam.name.toLowerCase().includes(dbTeam.name.toLowerCase())) {
        updates.push({
          current: dbTeam.db,
          new: espnTeam.espn,
          name: dbTeam.name
        });
      }
    });
  });

  if (updates.length > 0) {
    console.log('These teams should be updated:');
    updates.forEach(u => {
      console.log(`  ${u.current} → ${u.new}  (${u.name})`);
    });
  } else {
    console.log('✅ No mismatches found! All teams match ESPN.');
  }

  return updates;
}

checkTeamMismatches().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
