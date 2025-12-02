# Deployment Guide

Step-by-step guide to deploy your NFL Survivor Pool from scratch.

## Overview

1. Set up Supabase project
2. Run database scripts
3. Deploy Edge Function
4. Configure automation
5. Deploy frontend

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Name: `nfl-survivor-pool`
   - Database Password: (save this somewhere secure)
   - Region: Choose closest to you
5. Wait for project to finish setting up (~2 minutes)

## Step 2: Set Up Database

### 2.1 Get Your Project Details

Go to **Project Settings → API**:
- Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
- Copy **Project Reference ID** (the `xxxxx` part)
- Copy **anon** / **public** key (Legacy HS256)
- Copy **service_role** key (Legacy HS256)

### 2.2 Run SQL Scripts

Go to **SQL Editor** in Supabase Dashboard. Run these scripts **in order**:

#### Script 1: Initial Schema
```sql
-- Copy contents of database/01_initial_schema.sql
-- Creates all tables and RLS policies
```

#### Script 2: Triggers and Functions
```sql
-- Copy contents of database/02_triggers_and_functions.sql
-- Sets up automated pick updates
```

#### Script 3: Populate Weeks
```sql
-- Copy contents of database/03_populate_weeks_2025.sql
-- Adds all 18 weeks of 2025 season
```

#### Script 4: Populate NFL Teams
```sql
-- Copy contents of database/04_populate_nfl_teams.sql
-- Adds all 32 NFL teams
```

#### Script 5: Setup Cron Jobs
```sql
-- Copy contents of database/05_setup_cron_jobs.sql
-- ⚠️ IMPORTANT: Update these two variables first!

service_key TEXT := 'your-service-role-key';  -- Paste your service_role key
project_url TEXT := 'https://xxxxx.supabase.co';  -- Your project URL
```

#### Script 6: Sample Data (Optional)
```sql
-- Copy contents of database/06_sample_data.sql
-- Only run if you want test data for development
```

### 2.3 Verify Database Setup

Check that everything was created:
```sql
-- Should return 6 tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should return 32 teams
SELECT COUNT(*) FROM nfl_teams;

-- Should return 18 weeks
SELECT COUNT(*) FROM weeks WHERE season_year = 2025;

-- Should return 4 cron jobs
SELECT jobname, schedule, active FROM cron.job;
```

---

## Step 3: Deploy Edge Function

### 3.1 Install Supabase CLI

**Windows (PowerShell):**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Mac/Linux:**
```bash
npm install -g supabase
```

### 3.2 Login and Link

```bash
# Login (opens browser)
supabase login

# Link to your project
supabase link --project-ref your-project-ref
# Enter your database password when prompted
```

### 3.3 Deploy Function

```bash
# From project root directory
supabase functions deploy update-nfl-results
```

### 3.4 Test Function

**Windows:**
```powershell
curl.exe -X POST "https://your-project.supabase.co/functions/v1/update-nfl-results" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Mac/Linux:**
```bash
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

---

## Step 4: Configure Frontend

### 4.1 Create Environment File

Create `.env` in project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Test Locally

```bash
npm run dev
```

Visit `http://localhost:5173` - you should see the weekly picks page.

---

## Step 5: Deploy Frontend

### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`
7. Click "Deploy"

### Option B: Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select your repo
5. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add Environment Variables in Site settings
7. Click "Deploy site"

---

## Step 6: Verify Everything Works

### Test Automated Updates

Wait for a cron job to run (check times in `database/05_setup_cron_jobs.sql`), then:

```sql
-- Check if games were fetched
SELECT * FROM nfl_games WHERE week_id = (
  SELECT id FROM weeks WHERE week_number = 13 AND season_year = 2025
);

-- Check if picks were updated
SELECT p.name, t.abbreviation, pk.team_won, pk.is_strike
FROM picks pk
JOIN players p ON pk.player_id = p.id
JOIN nfl_teams t ON pk.team_id = t.id
JOIN weeks w ON pk.week_id = w.id
WHERE w.week_number = 13;
```

### Check Cron Job Logs

Supabase Dashboard → Database → Cron Jobs → View Logs

---

## Maintenance

### Update Season (Annually)

1. Create new weeks for next season:
   ```sql
   -- Modify database/03_populate_weeks_2025.sql for 2026
   -- Update season_year to 2026
   -- Update dates for 2026 season
   ```

2. Add new pool_settings:
   ```sql
   INSERT INTO pool_settings (season_year, entry_fee, buyback_fee, max_strikes)
   VALUES (2026, 50.00, 25.00, 2);
   ```

### Manual Game Updates

If you need to manually trigger updates:
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/update-nfl-results?week=13" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Backup Database

Supabase Dashboard → Database → Backups
- Automatic daily backups included
- Download manual backup anytime

---

## Troubleshooting

### Cron jobs not running

```sql
-- Check if jobs are active
SELECT * FROM cron.job;

-- Check logs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Edge Function errors

Check logs: Supabase Dashboard → Edge Functions → update-nfl-results → Logs

### Frontend not connecting

1. Verify `.env` file has correct keys
2. Check browser console for errors
3. Verify RLS policies allow public SELECT

---

## Security Checklist

- [ ] Service role key is NOT in any committed files
- [ ] `.env` is in `.gitignore`
- [ ] RLS policies are enabled on all tables
- [ ] Only service_role can INSERT/UPDATE/DELETE
- [ ] Public can only SELECT (read-only)

---

## Cost Estimate

### Supabase (Free Tier)
- ✅ 500MB database (plenty for survivor pool)
- ✅ 2GB file storage
- ✅ 500K Edge Function invocations/month (~480 needed)
- ✅ Unlimited API requests

### Vercel/Netlify (Free Tier)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS

**Total Monthly Cost: $0** (within free tiers)

---

## Next Steps

After deployment:
1. Build Player Management admin page
2. Build Pick Entry admin page
3. Invite players and collect entry fees
4. Enter weekly picks
5. Watch automation handle the rest!

Enjoy your automated survivor pool! 🏈
