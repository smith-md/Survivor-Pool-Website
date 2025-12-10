# Deployment Instructions - Supabase Auth Migration

This guide walks you through deploying your secure, auth-enabled Survivor Pool application to Cloudflare Pages.

## ✅ What Was Changed

The application has been migrated from hardcoded credentials to proper Supabase Auth:

1. **Removed service role key from frontend** - No longer exposed in JavaScript bundle
2. **Implemented Supabase Auth** - Email/password authentication for admin users
3. **Updated RLS policies** - Authenticated users can perform admin operations
4. **Removed `supabaseAdmin` client** - All operations now use the regular `supabase` client with proper auth

## 📋 Pre-Deployment Steps

### 1. Run the Database Migration

Execute the new RLS policy migration in your Supabase SQL Editor:

```bash
# File: database/07_update_rls_for_auth.sql
```

This will:
- Drop old service_role policies
- Create new authenticated user policies

### 2. Create an Admin User in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Enter your admin email and password
5. Click **Create user**

**Important**: Save these credentials - you'll use them to log into the admin panel.

### 3. Test Locally (Optional but Recommended)

```bash
# Start the dev server
npm run dev

# Try logging in with your Supabase Auth credentials
# Navigate to http://localhost:5173/admin/login
```

## 🚀 Cloudflare Deployment

### 1. Set Environment Variables in Cloudflare Pages

1. Go to **Cloudflare Pages Dashboard**
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add these variables for **Production**:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = your-anon-key-here
```

**⚠️ CRITICAL**: Do **NOT** add `VITE_SUPABASE_SERVICE_ROLE_KEY`. We removed it for security.

### 2. Deploy Your Application

Option A - Push to trigger automatic deployment:
```bash
git add .
git commit -m "Migrate to Supabase Auth for secure admin access"
git push origin main
```

Option B - Manual redeploy:
1. Go to Cloudflare Pages → **Deployments**
2. Click **Retry deployment** on the latest build

### 3. Verify the Deployment

1. Visit your deployed site
2. Navigate to `/admin/login`
3. Log in with the Supabase Auth credentials you created
4. Test admin operations (add player, enter picks, etc.)

## 🔐 Security Notes

### What's Now Secure

✅ **No service role key in frontend** - Service role key only used by Edge Functions (server-side)
✅ **Proper authentication** - Supabase Auth with encrypted sessions
✅ **RLS policies** - Database enforces authenticated access for admin operations
✅ **Public read access** - Anyone can view the pool, only authenticated users can modify

### Managing Admin Users

To add/remove admin users:
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Add user: Click **Add user**
3. Remove user: Click the three dots → **Delete user**

## 📝 Post-Deployment Checklist

- [ ] Database migration executed (`07_update_rls_for_auth.sql`)
- [ ] Admin user created in Supabase Auth
- [ ] Environment variables set in Cloudflare (URL + ANON_KEY only)
- [ ] Application deployed to Cloudflare
- [ ] Tested login with Supabase Auth credentials
- [ ] Verified admin operations work (add player, enter picks)
- [ ] Confirmed public leaderboard still visible without auth

## 🐛 Troubleshooting

### "supabaseKey is required" Error

**Cause**: Environment variables not set during build

**Fix**:
1. Verify variables are in Cloudflare Pages → Settings → Environment Variables
2. Ensure they're set for "Production" (not just "Preview")
3. Trigger a new deployment (rebuild required)

### "Invalid email or password" Error

**Cause**: User doesn't exist in Supabase Auth

**Fix**:
1. Go to Supabase Dashboard → Authentication → Users
2. Verify user exists with the email you're using
3. If not, create a new user

### Can't Perform Admin Operations (Insert/Update Fails)

**Cause**: RLS policies not updated or user not authenticated

**Fix**:
1. Verify you ran `07_update_rls_for_auth.sql` in Supabase
2. Check browser console for auth errors
3. Log out and log back in
4. Check Supabase Dashboard → Authentication to verify session

### Edge Function Still Has Access Issues

**Note**: Edge Functions should continue using the service role key (server-side). This is stored in Supabase Edge Function secrets, not environment variables:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🎉 You're Done!

Your application is now deployed with secure authentication. Only authenticated admin users can modify data, while the public can still view the pool standings.

**Next Steps**:
- Share the admin credentials securely with authorized users
- Consider enabling 2FA in Supabase for extra security
- Monitor authentication logs in Supabase Dashboard
