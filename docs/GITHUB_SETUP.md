# GitHub Setup Guide

How to get your NFL Survivor Pool project on GitHub.

## Quick Start

1. Download the repository archive
2. Extract it
3. Initialize Git
4. Push to GitHub

---

## Step-by-Step Instructions

### 1. Download and Extract

Download the [nfl-survivor-pool-repo.tar.gz](computer:///mnt/user-data/outputs/nfl-survivor-pool-repo.tar.gz) file.

**Windows:**
- Right-click → Extract (using 7-Zip or WinRAR)
- Or extract twice (first .gz, then .tar)

**Mac/Linux:**
```bash
tar -xzf nfl-survivor-pool-repo.tar.gz
cd nfl-survivor-pool-repo
```

### 2. Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the **+** icon → **New repository**
3. Fill in:
   - **Repository name**: `nfl-survivor-pool`
   - **Description**: `Automated NFL Survivor Pool with Supabase backend`
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **Create repository**

### 3. Initialize Git and Push

GitHub will show you commands - use these:

```bash
# Navigate to your project
cd nfl-survivor-pool-repo

# Initialize git (if not already done)
git init

# Add all files
git add .

# Make first commit
git commit -m "Initial commit: NFL Survivor Pool with automated results"

# Add GitHub as remote (replace YOUR_USERNAME)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nfl-survivor-pool.git

# Push to GitHub
git push -u origin main
```

**Note:** You'll need to authenticate with GitHub. Options:
- Personal Access Token (recommended)
- SSH key
- GitHub CLI (`gh auth login`)

---

## Project Structure on GitHub

```
nfl-survivor-pool/
├── .gitignore                    # Excludes node_modules, .env, etc.
├── README.md                     # Main documentation
├── package.json                  # Node dependencies
├── vite.config.js               # Vite configuration
├── index.html                   # Entry point
│
├── database/                     # All SQL scripts
│   ├── 01_initial_schema.sql
│   ├── 02_triggers_and_functions.sql
│   ├── 03_populate_weeks_2025.sql
│   ├── 04_populate_nfl_teams.sql
│   ├── 05_setup_cron_jobs.sql
│   └── 06_sample_data.sql
│
├── docs/                         # Documentation
│   ├── DEPLOYMENT.md
│   └── DATABASE_ARCHITECTURE.md
│
├── src/                          # React frontend
│   ├── main.jsx
│   ├── App.jsx
│   ├── lib/
│   │   └── supabase.js
│   └── pages/
│       ├── WeeklyPicks.jsx
│       ├── AdminDashboard.jsx
│       ├── AdminPlayers.jsx
│       └── AdminPicks.jsx
│
├── supabase/                     # Supabase Edge Functions
│   └── functions/
│       └── update-nfl-results/
│           └── index.ts
│
└── public/                       # Static assets
```

---

## Important: Protect Your Secrets

### Before Pushing

Make sure your `.env` file is NOT committed:

```bash
# Check .gitignore includes .env
cat .gitignore | grep .env
```

Should show:
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### If You Accidentally Committed Secrets

If you accidentally pushed your `.env` file or service role key:

1. **Immediately rotate your keys** in Supabase Dashboard
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   
   git push origin --force --all
   ```
3. Update your local `.env` with new keys

---

## Setting Up for Collaborators

### Environment Variables

If others will work on the project:

1. Share the `.env.example` file (in repo)
2. Send actual credentials separately (email, password manager, etc.)
3. Each person creates their own `.env` locally

### Development Workflow

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/nfl-survivor-pool.git
cd nfl-survivor-pool

# Create .env file
cp .env.example .env
# (Edit .env with actual keys)

# Install dependencies
npm install

# Run locally
npm run dev
```

---

## Branch Strategy (Optional)

For team development:

```bash
# Main branch = production
main

# Development branch
dev

# Feature branches
feature/player-management
feature/pick-entry
feature/email-notifications
```

Workflow:
```bash
# Create feature branch
git checkout -b feature/player-management

# Make changes, commit
git add .
git commit -m "Add player management page"

# Push feature branch
git push origin feature/player-management

# Create Pull Request on GitHub
# Merge to main after review
```

---

## Continuous Deployment

### With Vercel

1. Install Vercel GitHub app
2. Import your repository
3. Vercel auto-deploys on push to `main`
4. Set environment variables in Vercel dashboard

### With Netlify

1. Connect repository in Netlify
2. Auto-deploys on push to `main`
3. Set environment variables in Netlify settings

---

## Repository Settings

### Recommended Settings

**General:**
- ✅ Allow squash merging
- ✅ Automatically delete head branches
- ❌ Allow merge commits (keeps history clean)

**Branches:**
- Set `main` as default branch
- Add branch protection rules:
  - ✅ Require pull request reviews
  - ✅ Require status checks to pass

**Security:**
- ✅ Enable Dependabot alerts
- ✅ Enable secret scanning

---

## GitHub Actions (Optional)

### Auto-deploy Edge Function

Create `.github/workflows/deploy-edge-function.yml`:

```yaml
name: Deploy Edge Function

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Deploy function
        run: supabase functions deploy update-nfl-results
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

Add secrets in GitHub: Settings → Secrets → Actions

---

## Maintenance

### Regular Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Commit updated package-lock.json
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Tagging Releases

```bash
# Tag a release
git tag -a v1.0.0 -m "Version 1.0.0 - Initial release"
git push origin v1.0.0

# List tags
git tag -l
```

---

## Useful Git Commands

```bash
# Check status
git status

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git checkout -- filename.js

# Update from remote
git fetch origin
git merge origin/main

# Create and switch to new branch
git checkout -b feature-name

# Delete local branch
git branch -d feature-name

# Delete remote branch
git push origin --delete feature-name
```

---

## Next Steps

After pushing to GitHub:

1. ✅ Add a GitHub repository description
2. ✅ Add topics/tags: `nfl`, `survivor-pool`, `supabase`, `react`
3. ✅ Star your own repo (why not?)
4. ✅ Set up deployment to Vercel/Netlify
5. ✅ Share with your survivor pool participants!

---

## Troubleshooting

### "Permission denied (publickey)"

Set up SSH key or use HTTPS with Personal Access Token:
```bash
# Use HTTPS instead
git remote set-url origin https://github.com/YOUR_USERNAME/nfl-survivor-pool.git
```

### "Fatal: not a git repository"

```bash
cd nfl-survivor-pool-repo
git init
```

### Large files causing issues

Check `.gitignore` excludes:
- `node_modules/`
- `.env`
- `dist/`
- `*.log`

---

## Resources

- [GitHub Docs](https://docs.github.com)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Supabase GitHub Actions](https://supabase.com/docs/guides/cli/github-action)

Happy coding! 🏈
