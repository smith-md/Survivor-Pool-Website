# Deployment Checklist

Use this checklist to ensure you've completed all setup steps.

---

## ☐ Phase 1: Supabase Setup

### Create Project
- [ ] Sign up/login at supabase.com
- [ ] Create new project: `nfl-survivor-pool`
- [ ] Save database password securely
- [ ] Wait for project to finish provisioning (~2 min)

### Get API Keys
- [ ] Go to Project Settings → API
- [ ] Copy Project URL: `https://xxxxx.supabase.co`
- [ ] Copy Project Reference ID: `xxxxx`
- [ ] Copy anon/public key (Legacy HS256)
- [ ] Copy service_role key (Legacy HS256)
- [ ] Store all keys securely (password manager)

---

## ☐ Phase 2: Database Setup

### Run SQL Scripts (in order)
- [ ] Open SQL Editor in Supabase Dashboard
- [ ] Run `01_initial_schema.sql` ✅
  - [ ] Verify: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'` returns 6
- [ ] Run `02_triggers_and_functions.sql` ✅
  - [ ] Verify: No errors, trigger created
- [ ] Run `03_populate_weeks_2025.sql` ✅
  - [ ] Verify: `SELECT COUNT(*) FROM weeks WHERE season_year = 2025` returns 18
- [ ] Run `04_populate_nfl_teams.sql` ✅
  - [ ] Verify: `SELECT COUNT(*) FROM nfl_teams` returns 32
- [ ] Run `05_setup_cron_jobs.sql` ✅
  - [ ] Update `service_key` variable before running
  - [ ] Update `project_url` variable before running
  - [ ] Verify: `SELECT COUNT(*) FROM cron.job` returns 4
- [ ] (Optional) Run `06_sample_data.sql` for testing

### Verify Database
- [ ] 6 tables created
- [ ] 32 NFL teams populated
- [ ] 18 weeks populated
- [ ] 4 cron jobs scheduled
- [ ] No SQL errors in logs

---

## ☐ Phase 3: Edge Function Deployment

### Install Supabase CLI
**Windows:**
- [ ] Open PowerShell as Administrator
- [ ] Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
- [ ] Run: `irm get.scoop.sh | iex`
- [ ] Run: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git`
- [ ] Run: `scoop install supabase`
- [ ] Verify: `supabase --version`

**Mac/Linux:**
- [ ] Run: `npm install -g supabase`
- [ ] Verify: `supabase --version`

### Login and Link
- [ ] Run: `supabase login`
- [ ] Authorize in browser
- [ ] Run: `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Enter database password when prompted
- [ ] Verify: Connection successful

### Deploy Function
- [ ] Navigate to project root: `cd nfl-survivor-pool-repo`
- [ ] Run: `supabase functions deploy update-nfl-results`
- [ ] Verify: Deployment successful
- [ ] Check function appears in Supabase Dashboard → Edge Functions

### Test Function
**Windows:**
```powershell
curl.exe -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/update-nfl-results" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Mac/Linux:**
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/update-nfl-results" -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

- [ ] Function returns JSON response
- [ ] Response shows `"success": true`
- [ ] No errors in Edge Function logs

---

## ☐ Phase 4: Frontend Setup

### Local Development
- [ ] Extract repository: `nfl-survivor-pool-repo.tar.gz`
- [ ] Navigate to directory: `cd nfl-survivor-pool-repo`
- [ ] Copy `.env.example` to `.env`
- [ ] Edit `.env` with your Supabase credentials:
  - [ ] `VITE_SUPABASE_URL=https://xxxxx.supabase.co`
  - [ ] `VITE_SUPABASE_ANON_KEY=eyJ...`
  - [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...`
- [ ] Run: `npm install`
- [ ] Run: `npm run dev`
- [ ] Open browser: `http://localhost:5173`
- [ ] Verify: Page loads without errors

### Test Frontend
- [ ] Weekly Picks page displays
- [ ] No console errors
- [ ] Can see sample data (if loaded)
- [ ] Admin Dashboard accessible

---

## ☐ Phase 5: GitHub Setup

### Initialize Repository
- [ ] Run: `git init`
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Initial commit"`
- [ ] Verify `.env` is NOT committed (check .gitignore)

### Create GitHub Repo
- [ ] Go to github.com
- [ ] Create new repository: `nfl-survivor-pool`
- [ ] Choose visibility: Private (recommended)
- [ ] Do NOT initialize with README
- [ ] Copy repository URL

### Push to GitHub
- [ ] Run: `git remote add origin https://github.com/YOUR_USERNAME/nfl-survivor-pool.git`
- [ ] Run: `git branch -M main`
- [ ] Run: `git push -u origin main`
- [ ] Verify: All files pushed to GitHub
- [ ] Verify: `.env` is NOT in repository

---

## ☐ Phase 6: Production Deployment

### Option A: Vercel
- [ ] Go to vercel.com
- [ ] Click "New Project"
- [ ] Import GitHub repository
- [ ] Configure build settings (auto-detected)
- [ ] Add environment variables:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY`
- [ ] Click "Deploy"
- [ ] Wait for deployment
- [ ] Visit production URL
- [ ] Verify: Site works

### Option B: Netlify
- [ ] Go to netlify.com
- [ ] Click "Add new site"
- [ ] Import GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables (same as Vercel)
- [ ] Click "Deploy site"
- [ ] Visit production URL
- [ ] Verify: Site works

---

## ☐ Phase 7: Verification

### Test Automated Updates
- [ ] Wait for next scheduled cron job (check times in SQL script)
- [ ] Or manually trigger: `curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/update-nfl-results" -H "Authorization: Bearer YOUR_KEY"`
- [ ] Check Supabase logs for cron execution
- [ ] Verify games fetched: `SELECT COUNT(*) FROM nfl_games`
- [ ] Check Edge Function logs for any errors

### Test Database Automation
- [ ] Add sample picks (if not using sample data)
- [ ] Verify picks table populated
- [ ] Manually set a game to final status
- [ ] Check that pick was updated automatically
- [ ] Verify strike count increased
- [ ] Test elimination logic

### Frontend Verification
- [ ] Weekly Picks page loads
- [ ] Data displays correctly
- [ ] Admin Dashboard accessible
- [ ] No JavaScript errors
- [ ] Mobile responsive (test on phone)
- [ ] HTTPS certificate active

---

## ☐ Phase 8: Final Setup

### Documentation
- [ ] Update README with your specific details
- [ ] Document any customizations
- [ ] Create admin guide for your users
- [ ] Save all passwords/keys securely

### Security Review
- [ ] `.env` in `.gitignore` ✅
- [ ] Service role key not in code ✅
- [ ] RLS enabled on all tables ✅
- [ ] GitHub repo is private (if desired) ✅
- [ ] Backup database manually (first time)

### User Preparation
- [ ] Prepare list of participants
- [ ] Set entry fees in pool_settings
- [ ] Create communication plan
- [ ] Schedule picks deadline reminders

---

## ☐ Optional Enhancements

### Email Notifications
- [ ] Set up email service (SendGrid, etc.)
- [ ] Create notification templates
- [ ] Add to Edge Function or separate function

### Analytics
- [ ] Set up Google Analytics
- [ ] Track page views
- [ ] Monitor user engagement

### Monitoring
- [ ] Set up Supabase alerts
- [ ] Monitor Edge Function errors
- [ ] Check database performance

---

## 🎉 Launch Checklist

Before going live:
- [ ] All database tables created ✅
- [ ] All cron jobs scheduled ✅
- [ ] Edge Function deployed and tested ✅
- [ ] Frontend deployed and accessible ✅
- [ ] GitHub repository set up ✅
- [ ] Documentation updated ✅
- [ ] Security verified ✅
- [ ] Backup strategy in place ✅
- [ ] Admin accounts configured ✅
- [ ] Communication sent to participants ✅

---

## 📊 Success Metrics

After deployment, verify:
- [ ] Zero manual intervention needed for game updates
- [ ] Strikes calculated automatically
- [ ] Players eliminated correctly
- [ ] No errors in logs
- [ ] Participants can view picks
- [ ] Admin can manage pool

---

## 🆘 Troubleshooting

If something doesn't work:
1. [ ] Check Supabase logs (Dashboard → Logs)
2. [ ] Check Edge Function logs (Edge Functions → Logs)
3. [ ] Review browser console for errors
4. [ ] Verify environment variables
5. [ ] Re-run SQL scripts if needed
6. [ ] Check cron job status: `SELECT * FROM cron.job`

---

## 📝 Notes Section

Use this space for your own notes:

**Project URL:** _______________________

**Database Password:** (stored in: _______)

**Deployment Date:** _______________________

**Participants:** _______________________

**Entry Fee:** $_______________________

**Custom Changes:**
- 
- 
- 

---

**Completion Date:** __________________

**Deployed By:** ______________________

**Status:** ☐ Ready for Season! 🏈

---

Print this checklist and check off items as you complete them!
