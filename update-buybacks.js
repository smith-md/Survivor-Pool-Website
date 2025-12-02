import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateBuybacks(csvPath) {
  console.log('Reading CSV file...');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV
  const records = parse(fileContent, {
    skip_empty_lines: true,
    relax_column_count: true
  });

  // Skip header row
  const dataRows = records.slice(1);

  console.log(`Found ${dataRows.length} players in CSV\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of dataRows) {
    const playerName = row[0]?.trim();
    const rebuyStatus = row[3]?.trim(); // Column 3 is "Rebuy"
    const paidStatus = row[4]?.trim();   // Column 4 is "Paid?"

    if (!playerName) continue;

    const hasBoughtBack = rebuyStatus === 'Y';
    const buybackFeePaid = paidStatus === 'Y';

    console.log(`Processing: ${playerName}`);
    console.log(`  Rebuy: ${rebuyStatus || '(none)'} -> has_bought_back: ${hasBoughtBack}`);
    console.log(`  Paid: ${paidStatus || '(none)'} -> buyback_fee_paid: ${buybackFeePaid}`);

    // Find player in database
    const { data: players, error: findError } = await supabase
      .from('players')
      .select('id, name, first_name, last_name')
      .eq('season_year', 2025);

    if (findError) {
      console.error(`  Error finding players:`, findError);
      continue;
    }

    // Try to match by name (check both full name and first_name/last_name)
    const player = players.find(p => {
      const fullName = p.first_name
        ? `${p.first_name} ${p.last_name || ''}`.trim()
        : p.name;
      return fullName === playerName || p.name === playerName;
    });

    if (!player) {
      console.error(`  ⚠️  Player not found in database: ${playerName}`);
      skippedCount++;
      continue;
    }

    // Update player
    const { error: updateError } = await supabase
      .from('players')
      .update({
        has_bought_back: hasBoughtBack,
        buyback_fee_paid: buybackFeePaid
      })
      .eq('id', player.id);

    if (updateError) {
      console.error(`  ❌ Error updating player:`, updateError);
      skippedCount++;
    } else {
      console.log(`  ✓ Updated successfully`);
      updatedCount++;
    }
    console.log('');
  }

  console.log('\n========== UPDATE SUMMARY ==========');
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Skipped/Errors: ${skippedCount}`);
  console.log('====================================\n');

  // Show buyback counts
  const { data: allPlayers } = await supabase
    .from('players')
    .select('has_bought_back')
    .eq('season_year', 2025);

  const buybackCount = allPlayers?.filter(p => p.has_bought_back).length || 0;
  console.log(`Total players who have bought back: ${buybackCount}`);
  console.log(`Total pot will now include ${buybackCount} × $20 = $${buybackCount * 20} in buyback fees\n`);
}

const csvPath = process.argv[2] || 'C:\\Users\\smith\\Downloads\\Survivor League Football 2025 - Admin.csv';
updateBuybacks(csvPath).catch(console.error);
