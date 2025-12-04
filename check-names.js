import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNames() {
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name')
    .eq('season_year', 2025)
    .order('name');

  if (error) {
    console.error('Error fetching players:', error);
    return;
  }

  console.log('Current player names:');
  console.log('=====================');
  players.forEach(player => {
    const parts = player.name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || null;
    console.log(`"${player.name}" -> First: "${firstName}", Last: "${lastName || '(none)'}"`);
  });
}

checkNames().catch(console.error);
