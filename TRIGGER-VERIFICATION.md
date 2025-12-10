# Database Trigger Verification Guide

## What the Trigger Does

The `trigger_update_picks_from_game` trigger automatically updates picks when games are marked as final:

1. **Fires when**: `nfl_games` table is INSERT or UPDATE
2. **Condition**: Only processes if `game_status = 'final'`
3. **Updates**:
   - Sets `picks.team_won` (true/false)
   - Sets `picks.is_strike` (true if team lost)
   - Recalculates `players.strikes` count
   - Auto-eliminates players if strikes >= max_strikes

## Verification Tools

### 1. Test Current Trigger Status
```bash
node test-trigger.cjs
```

**What it checks:**
- Finds recent final games
- Verifies all picks have `team_won` set (not null)
- Validates values are correct (wins marked correctly, strikes accurate)
- Reports any pending or incorrect picks

**Expected output:**
```
✅ TRIGGER WORKING CORRECTLY for this game
```

**Red flags:**
- `⏳ Pending (team_won null): X` - Picks not updated by trigger
- `❌ ERROR: Pick has wrong team_won value` - Trigger logic bug

---

### 2. Manual Trigger Test
```bash
node manual-trigger-test.cjs
```

**What it does:**
- Selects a recent final game
- Force-updates the game (sets `updated_at = NOW()`)
- Checks if trigger fired and updated picks
- Shows before/after comparison

**Use when:**
- You suspect trigger stopped working
- Want to test trigger behavior in real-time

---

### 3. Update Pick Results (Manual Sync)
```bash
node update-pick-results.cjs
```

**What it does:**
- Bypasses trigger entirely
- Manually reads `nfl_games` and updates `picks`
- Use as emergency fallback if trigger fails

**When to use:**
- Trigger is confirmed broken
- Need to backfill historical data
- Emergency fix for incorrect strikes

---

## How to Verify Trigger is Enabled

### Via Supabase Dashboard (SQL Editor)

Run this query:
```sql
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_picks_from_game';
```

**Expected result:**
```
trigger_name: trigger_update_picks_from_game
event_object_table: nfl_games
action_timing: AFTER
event_manipulation: INSERT, UPDATE
```

If empty → **Trigger not installed!** Re-run `database/02_triggers_and_functions.sql`

---

## Common Issues & Solutions

### Issue 1: Picks Not Updated (team_won = null)

**Symptoms:**
- Game is marked `final`
- Picks still have `team_won = null`

**Causes:**
1. Trigger not installed → Re-run SQL migration
2. Trigger disabled → Check `pg_trigger` table
3. `home_won` / `away_won` are NULL → Edge Function didn't set winner

**Fix:**
```bash
# Check if game has winner set
# If not, re-fetch from ESPN
curl -X POST "https://your-project.supabase.co/functions/v1/update-nfl-results?week=X"

# Then manually sync picks
node update-pick-results.cjs
```

---

### Issue 2: Incorrect Strikes

**Symptoms:**
- Player has wrong strike count
- Pick marked as strike when team won (or vice versa)

**Causes:**
1. `team_won` value is incorrect
2. `is_strike` not properly set as NOT team_won
3. Player strikes count out of sync

**Fix:**
```bash
# Re-run trigger test
node test-trigger.cjs

# If values are wrong, manually sync
node update-pick-results.cjs
```

---

### Issue 3: Trigger Condition Prevents Re-Processing

**Symptoms:**
- Need to re-process a pick but trigger won't fire

**Explanation:**
The trigger has this condition:
```sql
WHERE team_won IS NULL  -- Only update if not already set
```

This prevents duplicate processing (good!) but also means you can't re-trigger updates.

**Fix:**
```sql
-- Manually reset pick to allow re-processing
UPDATE picks
SET team_won = NULL, is_strike = false
WHERE id = 'pick-id-here';

-- Then force game update to re-trigger
UPDATE nfl_games
SET updated_at = NOW()
WHERE id = 'game-id-here';
```

---

## Monitoring Best Practices

### After Each Week's Games:

1. **Run verification:**
   ```bash
   node test-trigger.cjs
   ```

2. **Check for missing picks:**
   ```bash
   node diagnose-missing-picks.cjs [week-number]
   ```

3. **Verify player strikes:**
   ```bash
   node check-losses.cjs
   ```

### If Issues Found:

1. Check Edge Function logs for ESPN API errors
2. Verify all games are marked `final` in `nfl_games`
3. Run trigger test to isolate issue
4. Use manual sync as emergency fix
5. Investigate root cause (trigger vs Edge Function)

---

## Trigger Source Code

Located in: `database/02_triggers_and_functions.sql`

Function: `update_picks_from_game_result()`
Trigger: `trigger_update_picks_from_game`

To re-install trigger:
```bash
# Via Supabase SQL Editor
# Copy contents of database/02_triggers_and_functions.sql
# Paste and execute
```

---

## Quick Reference

| Scenario | Command | Expected Result |
|----------|---------|-----------------|
| Verify trigger working | `node test-trigger.cjs` | All picks updated, correct values |
| Test trigger fires | `node manual-trigger-test.cjs` | Picks updated in last 5 seconds |
| Emergency fix | `node update-pick-results.cjs` | All picks synced from games |
| Check game data | `node check-game-results.cjs` | All games have final status |
| Verify strikes | `node check-losses.cjs` | Strike counts match pick counts |

---

## Success Criteria

✅ **Trigger is working if:**
- All final games have corresponding picks with `team_won != null`
- `team_won` values match game outcomes
- `is_strike` equals `NOT team_won`
- Player strike counts equal count of picks where `is_strike = true`
- Eliminated players have `strikes >= max_strikes`

❌ **Trigger is broken if:**
- Final games exist but picks have `team_won = null`
- `team_won` values don't match game outcomes
- No picks updated after game marked final
- Trigger test shows "PENDING" or "ERROR"
