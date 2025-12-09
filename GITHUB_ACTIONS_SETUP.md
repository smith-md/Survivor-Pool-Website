# GitHub Actions Setup for Automated Game Updates

This document explains how to set up automated NFL game result updates using GitHub Actions (100% free).

## How It Works

The workflow (`.github/workflows/update-nfl-results.yml`) automatically runs during NFL game windows:
- **Thursday Night Football**: Hourly from 1-6 AM UTC Friday (8 PM - 1 AM ET Thursday)
- **Sunday Games**: Hourly from 6 PM UTC Sunday through 6 AM UTC Monday (1 PM ET Sunday - 1 AM ET Monday)
- **Monday Night Football**: Hourly from 1-6 AM UTC Tuesday (8 PM - 1 AM ET Monday)

The workflow only runs during NFL season months (September-January).

## Setup Steps

### 1. Push Code to GitHub

If you haven't already, push this repository to GitHub:

```bash
git add .github/workflows/update-nfl-results.yml
git commit -m "Add GitHub Actions workflow for automated game updates"
git push origin main
```

### 2. Add GitHub Secrets

Go to your GitHub repository and add these secrets:

1. Navigate to: **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these two secrets:

**Secret 1:**
- Name: `SUPABASE_URL`
- Value: `https://iiakbqloayflsbchtfki.supabase.co`

**Secret 2:**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpYWticWxvYXlmbHNiY2h0ZmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUxNDg4MywiZXhwIjoyMDgwMDkwODgzfQ.psToTV5YJMIDstmt4nny0_ovBOHS3IX-NxV0JhraCh8`

### 3. Enable GitHub Actions

1. Go to the **Actions** tab in your repository
2. If prompted, click **"I understand my workflows, go ahead and enable them"**
3. You should see the workflow "Update NFL Game Results" listed

### 4. Test the Workflow (Optional)

You can manually trigger the workflow to test it:

1. Go to **Actions** tab
2. Click **"Update NFL Game Results"** workflow
3. Click **"Run workflow"** dropdown
4. Optionally enter a week number (leave blank for auto-detect)
5. Click **"Run workflow"** button

You'll see the workflow run and can check the logs to verify it worked.

## Monitoring

- **View Past Runs**: Go to Actions tab to see all workflow runs
- **Check Logs**: Click any run to see detailed logs
- **Manual Trigger**: Use "Run workflow" button anytime you need to manually fetch results

## Schedule Breakdown

The workflow runs **hourly** during these windows (all times in UTC):

| Day | UTC Time | ET Time | Purpose |
|-----|----------|---------|---------|
| Friday (day 5) | 1-6 AM | Thu 8 PM - Fri 1 AM | Thursday Night Football |
| Sunday (day 0) | 6-11 PM | Sun 1-6 PM | Sunday afternoon games |
| Monday (day 1) | 0-6 AM | Sun 7 PM - Mon 1 AM | Sunday night game |
| Tuesday (day 2) | 1-6 AM | Mon 8 PM - Tue 1 AM | Monday Night Football |

## Troubleshooting

**Workflow not running?**
- Check that GitHub Actions is enabled in your repo settings
- Verify secrets are added correctly (no extra spaces)
- Check workflow run history for errors

**Getting 401 errors?**
- Verify `SUPABASE_SERVICE_ROLE_KEY` secret is correct
- Make sure it's the service role key, not the anon key

**Games not updating?**
- Manually trigger workflow and check logs
- Verify Edge Function is deployed: `supabase functions deploy update-nfl-results`
- Check Edge Function logs: `supabase functions logs update-nfl-results`

## Cost

GitHub Actions is **100% free** for public repositories and includes 2,000 minutes/month for private repositories. This workflow uses ~6-8 minutes per week, well within free limits.
