# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NFL Survivor Pool web application with 2-loss elimination system and automated game results from ESPN API. Backend uses Supabase (PostgreSQL + Edge Functions), frontend uses React 18 + Vite. Automated scoring through database triggers and cron jobs.

## Development Commands

### Frontend Development
```bash
npm run dev          # Start Vite dev server (usually http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Database Utility Scripts
All scripts use Node.js CommonJS format (`.cjs`) and require `.env` file with Supabase credentials:

```bash
node update-pick-results.cjs          # Manually sync pick results from nfl_games table
node check-picks.cjs                  # Validate picks data integrity
node check-game-results.cjs           # Verify game results from ESPN
node check-losses.cjs                 # Audit player losses/strikes
node diagnose-missing-picks.cjs       # Find missing picks for a week
node import-historical-games.cjs      # Backfill historical game data
node fix-washington-team.cjs          # Fix Washington team name issues
node fix-washington-picks.cjs         # Fix picks referencing old Washington names
```

### Supabase Edge Functions
```bash
supabase functions deploy update-nfl-results    # Deploy ESPN API function
supabase functions logs update-nfl-results      # View function logs

# Test function manually (Windows)
curl.exe -X POST "https://your-project.supabase.co/functions/v1/update-nfl-results" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Architecture

### Data Flow
1. **ESPN API → Edge Function**: Supabase Edge Function (`supabase/functions/update-nfl-results/index.ts`) fetches game results from ESPN API every 2 hours during game windows (Thu/Sun/Mon nights)
2. **Edge Function → Database**: Upserts game data to `nfl_games` table with status, scores, winners
3. **Database Triggers → Auto-updates**: PostgreSQL trigger (`update_picks_from_game_result()` in `database/02_triggers_and_functions.sql`) automatically:
   - Updates `picks.team_won` and `picks.is_strike` when games are final
   - Recalculates `players.strikes` by counting strikes
   - Sets `players.is_eliminated = true` when strikes >= max_strikes
4. **React Frontend**: Queries Supabase for display (no manual result entry needed)

### Database Schema (Key Tables)
- **players**: Player info, strikes count, elimination status, payment tracking
- **nfl_teams**: All 32 NFL teams with abbreviations, conference, division
- **weeks**: 18 regular season weeks with date ranges for 2025 season
- **picks**: Player picks per week (constraints: one pick per week, no team reuse per player)
- **nfl_games**: Game results from ESPN (unique on `espn_event_id`)
- **pool_settings**: Global config (entry fees, buyback fees, max_strikes)

### Automated Scoring Logic
**Critical**: The scoring system is fully automated via database triggers. When `nfl_games` is updated:
1. Trigger fires on INSERT/UPDATE to `nfl_games`
2. If `game_status = 'final'`, updates all relevant picks
3. Recounts strikes for affected players
4. Auto-eliminates players if strikes >= `pool_settings.max_strikes` AND `has_bought_back = false`

**Never** manually set `picks.is_strike` or `players.strikes` - let triggers handle it.

### Admin Authentication
Simple session-based auth (hardcoded password in AdminLogin.jsx). Auth stored in sessionStorage with 24-hour expiration. ProtectedRoute component guards admin pages.

**Note**: Current implementation uses hardcoded credentials. For production, migrate to proper auth system (Supabase Auth recommended).

### Supabase Client Configuration
Two clients in `src/lib/supabase.js`:
- `supabase`: Uses ANON key for public read access
- `supabaseAdmin`: Uses SERVICE_ROLE key for admin operations

**Security**: SERVICE_ROLE key bypasses RLS policies. Only use in admin pages behind authentication.

## Key Files

### Frontend
- `src/App.jsx`: Main router with public and protected routes
- `src/pages/Home.jsx`: Combined public view (leaderboard + weekly picks)
- `src/pages/AdminDashboard.jsx`: Admin hub with navigation
- `src/pages/AdminPlayers.jsx`: Player management (add/edit/delete, payment tracking)
- `src/pages/AdminPicks.jsx`: Weekly pick entry form with team validation
- `src/pages/AdminResults.jsx`: Manual game result overrides (rarely needed)
- `src/components/ProtectedRoute.jsx`: Auth guard for admin routes

### Backend
- `supabase/functions/update-nfl-results/index.ts`: ESPN API integration
  - Fetches scoreboard for current week (auto-detected or specified via `?week=N`)
  - Upserts games to `nfl_games` table
  - Season year hardcoded to 2025 (line 6)
- `database/02_triggers_and_functions.sql`: Core automation logic
  - `update_picks_from_game_result()` function
  - `trigger_update_picks_from_game` trigger on `nfl_games`

### Utility Scripts
- `update-pick-results.cjs`: Emergency manual sync if triggers fail
- All `check-*.cjs` scripts: Data validation and diagnostics
- All `fix-*.cjs` scripts: One-time data corrections

## Common Development Tasks

### Database Setup (First Time)
Run SQL files in order via Supabase SQL Editor:
1. `database/01_initial_schema.sql` - Tables, RLS policies
2. `database/02_triggers_and_functions.sql` - Automation
3. `database/03_populate_weeks_2025.sql` - Season weeks
4. `database/04_populate_nfl_teams.sql` - All 32 teams
5. `database/05_setup_cron_jobs.sql` - Scheduled updates (update `service_key` and `project_url` vars first)
6. `database/06_sample_data.sql` - (Optional) Test data

### Adding a New Week
Weeks are pre-populated for 2025 season. For future seasons, follow pattern in `database/03_populate_weeks_2025.sql`.

### Debugging Missing Game Results
1. Check Edge Function logs: `supabase functions logs update-nfl-results`
2. Verify week exists: `SELECT * FROM weeks WHERE week_number = N;`
3. Check cron jobs are scheduled: `SELECT * FROM cron.job;`
4. Manual trigger: `curl.exe -X POST https://your-project.supabase.co/functions/v1/update-nfl-results`
5. If needed, run `node update-pick-results.cjs` to sync

### Team Abbreviations
Database uses ESPN's official team abbreviations (e.g., "WSH" for Washington Commanders). All team abbreviations match ESPN API exactly - no mapping needed.

### Modifying Max Strikes
Update `pool_settings` table, not hardcoded values. Triggers reference `max_strikes` from this table.

## Environment Variables

Required in `.env` for local development:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  (public key)
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...  (secret - never commit!)
```

**Important**: Use Legacy HS256 (Shared Secret) keys from Supabase dashboard, not newer key formats.

## Cron Job Schedule

Automated updates run only during game windows (Sep-Jan):
- **Thursday Night**: 1-5 AM UTC Friday (covers 8 PM - midnight ET Thursday)
- **Sunday**: 6 PM - 5 AM UTC (covers 1 PM ET Sunday - midnight ET Sunday)
- **Monday Night**: 1-5 AM UTC Tuesday (covers 8 PM - midnight ET Monday)

Schedule in `database/05_setup_cron_jobs.sql`. Jobs call Edge Function which fetches ESPN API and updates database.

## Common Pitfalls

1. **Don't manually update `picks.is_strike` or `players.strikes`** - Triggers handle this. Manual updates cause inconsistencies.

2. **Team abbreviations must match ESPN** - Database uses ESPN's exact abbreviations. If ESPN changes an abbreviation, update the `nfl_teams` table to match.

3. **Week detection relies on date ranges** - If games aren't updating, verify `weeks.start_date` and `weeks.end_date` are correct.

4. **Service role key required for Edge Function** - Anon key cannot write to database. Edge Function needs SERVICE_ROLE key.

5. **Cron jobs need correct month filter** - Jobs only run months 9-12,1. If testing off-season, modify cron schedule or call function manually.

6. **RLS policies affect client access** - Admin operations require `supabaseAdmin` client (service role key), not regular `supabase` client.

## Testing Notes

- No formal test suite currently. Manual testing via admin pages and utility scripts.
- Use `database/06_sample_data.sql` to populate test data.
- Test game updates manually: `curl.exe -X POST https://your-project.supabase.co/functions/v1/update-nfl-results?week=1`
- Verify triggers: Insert test game with `game_status='final'` and check picks update.

## Season Rollover (Annual Task)

To prepare for a new season:
1. Update `SEASON` constant in `supabase/functions/update-nfl-results/index.ts` (line 6)
2. Create new weeks: Duplicate `database/03_populate_weeks_2025.sql` for new year
3. Add new season to `pool_settings` table
4. Archive or truncate previous season's `picks` and `nfl_games` (optional)
5. Redeploy Edge Function: `supabase functions deploy update-nfl-results`

## Additional Documentation

See README.md for deployment instructions and comprehensive setup guide.
