const fs = require('fs');
const { parse } = require('csv-parse/sync');

const CSV_PATH = 'C:\\Users\\smith\\Downloads\\Survivor League Football 2025 - Picks.csv';

const csv = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = csv.split('\n');
const cleanedLines = lines.map(line => {
  const cols = line.split(',');
  if (cols.length > 21) {
    return cols.slice(0, 21).join(',');
  }
  return line;
});

const records = parse(cleanedLines.join('\n'), {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

console.log('Checking picks that should be bye weeks:\n');

const ashleyL = records.find(r => r.Participant && r.Participant.includes('Ashley L'));
console.log('Ashley L:');
console.log('  Week 4:', ashleyL['Week 4']);
console.log('  Week 5:', ashleyL['Week 5']);

const ar = records.find(r => r.Participant === 'AR');
console.log('\nAR:');
console.log('  Week 8:', ar['Week 8']);

const anthonyL = records.find(r => r.Participant && r.Participant.includes('Anthony Lawrey'));
console.log('\nAnthony Lawrey:');
console.log('  Week 4:', anthonyL['Week 4']);
