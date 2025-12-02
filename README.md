# NFL Survivor Pool

A full-stack web application for managing an NFL Survivor Pool with automated game results updates.

## Features

- **2-Loss Elimination System** with buyback option
- **Automated Game Results** - Fetches scores from ESPN API every 2 hours during games
- **Automatic Strike Calculation** - Database triggers update player standings in real-time
- **Weekly Picks Display** - Public table view showing all player picks and results
- **Admin Dashboard** - Manage players, entry fees, and weekly picks
- **Scalable** - Supports 36-50+ participants

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Automation**: Supabase Cron Jobs + pg_cron extension
- **Data Source**: ESPN API

## Project Structure

```
nfl-survivor-pool/
├── database/                          # All SQL scripts
│   ├── 01_initial_schema.sql         # Create tables and RLS policies
│   ├── 02_triggers_and_functions.sql # Automated pick updates
│   ├── 03_populate_weeks_2025.sql    # 2025 season weeks
│   ├── 04_populate_nfl_teams.sql     # All 32 NFL teams
│   ├── 05_setup_cron_jobs.sql        # Automated game updates
│   └── 06_sample_data.sql            # Test data (optional)
├── supabase/
│   └── functions/
│       └── update-nfl-results/       # Edge Function for ESPN API
├── src/                               # React frontend
│   ├── lib/
│   │   └── supabase.js               # Supabase client
│   ├── pages/
│   │   ├── WeeklyPicks.jsx           # Public picks table
│   │   ├── AdminDashboard.jsx        # Admin hub
│   │   ├── AdminPlayers.jsx          # Player management (TODO)
│   │   └── AdminPicks.jsx            # Pick entry (TODO)
│   ├── App.jsx
│   └── main.jsx
└── docs/                              # Additional documentation

```

## Database Schema

### Core Tables
- **players** - Participant info, strikes, elimination status, payment tracking
- **nfl_teams** - All 32 NFL teams with conference/division
- **weeks** - 18 weeks of regular season with date ranges
- **picks** - Player picks with constraints (one pick per week, no team reuse)
- **nfl_games** - Game results from ESPN API
- **pool_settings** - Entry fees, buyback fees, max strikes per season

### Automated Logic
- Database trigger monitors `nfl_games` for status='final'
- Automatically updates `picks.team_won` and `picks.is_strike`
- Recalculates `players.strikes` by counting strikes
- Auto-eliminates players when strikes >= max_strikes

## Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- Supabase CLI installed:
  - **Windows**: Use Scoop package manager
    ```powershell
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
    irm get.scoop.sh | iex
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    scoop install supabase
    ```
  - **Mac/Linux**: `npm install -g supabase`

### 2. Database Setup

Run these SQL files **in order** in your Supabase SQL Editor:

1. `database/01_initial_schema.sql` - Creates all tables
2. `database/02_triggers_and_functions.sql` - Sets up automation
3. `database/03_populate_weeks_2025.sql` - Adds 2025 season weeks
4. `database/04_populate_nfl_teams.sql` - Adds all 32 teams
5. `database/05_setup_cron_jobs.sql` - Schedules automated updates
   - ⚠️ Update `service_key` and `project_url` variables before running
6. `database/06_sample_data.sql` - (Optional) Test data

### 3. Deploy Edge Function

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy update-nfl-results

# Set environment variables (optional, uses default Supabase connection)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Frontend Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
# VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run development server
npm run dev
```

### 5. Test the System

Test the Edge Function manually:
```powershell
# Windows PowerShell
curl.exe -X POST "https://your-project.supabase.co/functions/v1/update-nfl-results" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Mac/Linux
curl -X POST "https://your-project.supabase.co/functions/v1/update-nfl-results" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Expected response:
```json
{
  "success": true,
  "week": 13,
  "games_processed": 16,
  "games_created": 0,
  "games_updated": 15
}
```

## Automated Results System

### How It Works

1. **Cron jobs run during game windows**:
   - Thursday Night: 1-5 AM UTC Friday (8 PM - midnight ET Thursday)
   - Sunday: 6 PM - 5 AM UTC (1 PM ET Sunday - midnight ET Sunday)
   - Monday Night: 1-5 AM UTC Tuesday (8 PM - midnight ET Monday)

2. **Edge Function fetches ESPN API**:
   - Auto-detects current week from `weeks` table
   - Fetches scoreboard data
   - Upserts games to `nfl_games` table

3. **Database trigger fires**:
   - Updates picks when games are final
   - Calculates strikes automatically
   - Eliminates players if strikes >= max_strikes

### Cron Schedule Details

- Only runs **September through January** (months 9-12, 1)
- Approximately **20 API calls per week** during season
- **0 API calls** in off-season
- Free within Supabase limits (500K invocations/month)

### Managing Cron Jobs

View scheduled jobs:
```sql
SELECT * FROM cron.job;
```

Unschedule a job:
```sql
SELECT cron.unschedule('job-name-here');
```

## API Keys

You need three keys from Supabase Dashboard → Settings → API:

1. **Project URL**: `https://xxxxx.supabase.co`
2. **Anon Key** (public): Used in frontend for read access
3. **Service Role Key** (secret): Used for Edge Function and cron jobs
   - ⚠️ Use the **Legacy HS256 (Shared Secret)** keys (start with `eyJ...`)
   - Never commit this to GitHub!

## Deployment

### Frontend (Vercel/Netlify)

1. Push to GitHub
2. Connect repository to Vercel or Netlify
3. Set environment variables in deployment settings
4. Deploy!

### Edge Function

Already deployed to Supabase - no additional hosting needed!

## Development Roadmap

### Current Status ✅
- Database schema with automation
- Edge Function with ESPN API integration
- Cron job scheduling
- Public weekly picks page
- Admin dashboard structure

### TODO 🚧
- Player Management admin page (add/edit/delete players, payment tracking)
- Pick Entry admin page (weekly form with team validation)
- Email notifications for picks reminder
- Historical stats and analytics
- Mobile responsive improvements

## Troubleshooting

### "Week X isn't in the database"
- Run `database/03_populate_weeks_2025.sql` to add all weeks

### "Invalid JWT" error
- Make sure you're using the **Legacy HS256** service role key (not the newer key format)
- Key should start with `eyJ...` and be 200+ characters long

### Edge Function not updating
- Check logs in Supabase Dashboard → Edge Functions → Logs
- Verify cron jobs are scheduled: `SELECT * FROM cron.job;`
- Test manually with curl to see error messages

### Windows npm installation issues
- Use Scoop package manager instead of npm for Supabase CLI
- See Prerequisites section above

## Contributing

This is a personal project, but feel free to fork and adapt for your own survivor pool!

## License

MIT

## Support

For questions or issues, check the `/docs` folder or review the comprehensive conversation transcript.
