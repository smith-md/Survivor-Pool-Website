const fs = require('fs');

const csvPath = 'C:\\Users\\smith\\Downloads\\Survivor League Football 2023 - Picks.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('2023 Season Analysis:\n');

const players = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cells = line.split(',');
  const rebuy = cells[1] === 'Y';
  const name = cells[3];
  const lossesInColumn = parseInt(cells[4]) || 0;

  if (!name) continue;

  // Find last week with a pick
  let lastWeek = 0;
  for (let w = 5; w <= 22; w++) {
    if (cells[w] && cells[w].trim()) {
      lastWeek = w - 4;
    }
  }

  // Count actual losses from results (columns 25-42 for weeks 1-18)
  let actualLosses = 0;
  for (let w = 1; w <= 18; w++) {
    const resultCol = 24 + w;
    if (cells[resultCol] === '1') {
      actualLosses++;
    }
  }

  players.push({
    name,
    rebuy,
    lossesInColumn,
    actualLosses,
    lastWeek
  });
}

// Sort by last week (descending), then by losses (ascending)
players.sort((a, b) => {
  if (b.lastWeek !== a.lastWeek) return b.lastWeek - a.lastWeek;
  return a.actualLosses - b.actualLosses;
});

console.log('Players sorted by how far they made it:\n');
players.forEach((p, i) => {
  const status = p.actualLosses >= 2 ? '❌ OUT' : '✅ ALIVE';
  console.log(`${i + 1}. ${p.name.padEnd(20)} - Last Pick: Week ${p.lastWeek.toString().padStart(2)}  Losses: ${p.actualLosses}  ${status}  ${p.rebuy ? '(Rebuy)' : ''}`);
});

const survivors = players.filter(p => p.actualLosses < 2 && p.lastWeek === 18);
console.log(`\n${survivors.length > 0 ? '🏆 WINNER(S):' : '💀 No survivors with < 2 losses through Week 18'}`);
survivors.forEach(p => console.log(`   ${p.name}`));

const lastStanding = players[0];
console.log(`\n📊 Last player standing: ${lastStanding.name} (Week ${lastStanding.lastWeek}, ${lastStanding.actualLosses} losses)`);
