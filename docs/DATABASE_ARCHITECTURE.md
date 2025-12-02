# Database Architecture

Detailed documentation of the database schema, relationships, and automated logic.

## Entity Relationship Diagram

```
┌─────────────────┐
│  pool_settings  │
│─────────────────│
│ id (PK)         │
│ season_year     │
│ entry_fee       │
│ buyback_fee     │
│ total_pot       │
│ max_strikes     │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    nfl_teams    │       │      weeks      │       │     players     │
│─────────────────│       │─────────────────│       │─────────────────│
│ id (PK)         │◄──┐   │ id (PK)         │◄──┐   │ id (PK)         │
│ abbreviation    │   │   │ week_number     │   │   │ name            │
│ full_name       │   │   │ season_year     │   │   │ email           │
│ conference      │   │   │ start_date      │   │   │ strikes         │
│ division        │   │   │ end_date        │   │   │ is_active       │
└─────────────────┘   │   │ is_complete     │   │   │ is_eliminated   │
                      │   └─────────────────┘   │   │ has_bought_back │
                      │           │              │   │ entry_fee_paid  │
                      │           │              │   │ buyback_fee_paid│
                      │           │              │   │ season_year     │
                      │           │              │   └─────────────────┘
                      │           │              │           │
                      │           │              │           │
                      │           ▼              │           ▼
                      │   ┌─────────────────┐   │   ┌─────────────────┐
                      │   │   nfl_games     │   │   │      picks      │
                      │   │─────────────────│   │   │─────────────────│
                      │   │ id (PK)         │   │   │ id (PK)         │
                      │   │ week_id (FK)    ├───┘   │ player_id (FK)  ├───┘
                      └───┤ home_team_id(FK)│       │ week_id (FK)    ├───┐
                          │ away_team_id(FK)├───┐   │ team_id (FK)    ├───┼───┐
                          │ home_score      │   │   │ team_won        │   │   │
                          │ away_score      │   │   │ is_strike       │   │   │
                          │ home_won        │   │   └─────────────────┘   │   │
                          │ away_won        │   └─────────────────────────┘   │
                          │ game_status     │                                 │
                          │ game_date       │                                 │
                          │ espn_event_id   │                                 │
                          └─────────────────┘                                 │
                                                                              │
                          ┌───────────────────────────────────────────────────┘
                          │
                          ▼
                  (Triggers update picks and players)
```

## Tables

### pool_settings

Stores season-level configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| season_year | INTEGER | Year of the season (e.g., 2025) |
| entry_fee | DECIMAL(10,2) | Cost to enter pool |
| buyback_fee | DECIMAL(10,2) | Cost to buy back in after 2 strikes |
| total_pot | DECIMAL(10,2) | Total money in pool |
| max_strikes | INTEGER | Strikes before elimination (default: 2) |

**Constraints:**
- `season_year` is UNIQUE (one settings row per season)

**Usage:**
- Retrieved by triggers to determine elimination threshold
- Updated manually by pool admin

---

### nfl_teams

All 32 NFL teams.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| abbreviation | VARCHAR(5) | ESPN API abbreviation (e.g., 'KC', 'SF') |
| full_name | VARCHAR(100) | Full team name |
| conference | VARCHAR(3) | 'AFC' or 'NFC' |
| division | VARCHAR(10) | 'North', 'South', 'East', 'West' |

**Constraints:**
- `abbreviation` is UNIQUE
- `conference` CHECK constraint (AFC/NFC only)
- `division` CHECK constraint (North/South/East/West only)

**Usage:**
- Referenced by `picks` and `nfl_games`
- Used to validate team selections
- Maps ESPN API abbreviations to database IDs

---

### weeks

18 weeks of the regular season.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| week_number | INTEGER | 1-18 |
| season_year | INTEGER | Year (e.g., 2025) |
| start_date | DATE | First day of week |
| end_date | DATE | Last day of week |
| is_complete | BOOLEAN | Whether all games are finished |

**Constraints:**
- `(week_number, season_year)` is UNIQUE
- Each season has exactly 18 weeks

**Usage:**
- Edge Function auto-detects current week by checking `start_date`
- Admin can manually mark `is_complete = true` to close picking

---

### players

All pool participants.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Player name |
| email | VARCHAR(255) | Email address (optional) |
| strikes | INTEGER | Current strike count (0-3) |
| is_active | BOOLEAN | Whether player is in the pool |
| is_eliminated | BOOLEAN | Whether player has been eliminated |
| has_bought_back | BOOLEAN | Whether player has used buyback |
| entry_fee_paid | BOOLEAN | Payment tracking |
| buyback_fee_paid | BOOLEAN | Payment tracking |
| season_year | INTEGER | Which season (for multi-year tracking) |

**Constraints:**
- `email` is UNIQUE (if provided)
- `strikes` CHECK constraint (>= 0)

**Automated Updates:**
- `strikes` recalculated by trigger when games complete
- `is_eliminated` set to true when `strikes >= max_strikes` and `has_bought_back = false`

**Usage:**
- Tracks player standings
- Determines eligibility (active, not eliminated)
- Manages payment status

---

### picks

Player team selections for each week.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| player_id | UUID | Foreign key → players |
| week_id | UUID | Foreign key → weeks |
| team_id | UUID | Foreign key → nfl_teams |
| team_won | BOOLEAN | NULL until game completes, then TRUE/FALSE |
| is_strike | BOOLEAN | TRUE if team lost (team_won = FALSE) |

**Constraints:**
- `(player_id, week_id)` is UNIQUE - one pick per player per week
- `(player_id, team_id)` is UNIQUE - can't pick same team twice

**Automated Updates:**
- `team_won` set by trigger when corresponding game in `nfl_games` is final
- `is_strike` set to `TRUE` when `team_won = FALSE`

**Usage:**
- Stores all player picks
- Automatically updated when games finish
- Enforces "no team reuse" rule via constraint

---

### nfl_games

Game results from ESPN API.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| week_id | UUID | Foreign key → weeks |
| home_team_id | UUID | Foreign key → nfl_teams |
| away_team_id | UUID | Foreign key → nfl_teams |
| home_score | INTEGER | Final home team score |
| away_score | INTEGER | Final away team score |
| home_won | BOOLEAN | TRUE if home team won |
| away_won | BOOLEAN | TRUE if away team won |
| game_status | VARCHAR(20) | 'scheduled', 'in_progress', or 'final' |
| game_date | TIMESTAMPTZ | Game start time |
| espn_event_id | VARCHAR(50) | ESPN's unique game ID |

**Constraints:**
- `espn_event_id` is UNIQUE (prevents duplicate game entries)
- `game_status` CHECK constraint (only allows 3 values)

**Automated Updates:**
- Upserted by Edge Function every 2 hours during game windows
- Trigger fires when `game_status = 'final'`

**Usage:**
- Source of truth for game results
- Triggers cascade updates to picks and players
- Links to ESPN API via `espn_event_id`

---

## Automated Logic

### Database Trigger: update_picks_from_game_result

**Trigger Event:** AFTER INSERT OR UPDATE ON `nfl_games`

**Condition:** Only fires when `game_status = 'final'`

**Actions:**

1. **Update picks for home team:**
   ```sql
   UPDATE picks
   SET team_won = NEW.home_won,
       is_strike = NOT NEW.home_won,
       updated_at = NOW()
   WHERE team_id = NEW.home_team_id
     AND week_id = NEW.week_id
     AND team_won IS NULL;  -- Only update if not already set
   ```

2. **Update picks for away team:**
   ```sql
   UPDATE picks
   SET team_won = NEW.away_won,
       is_strike = NOT NEW.away_won,
       updated_at = NOW()
   WHERE team_id = NEW.away_team_id
     AND week_id = NEW.week_id
     AND team_won IS NULL;
   ```

3. **Recalculate player strikes:**
   ```sql
   UPDATE players
   SET strikes = (
     SELECT COUNT(*)
     FROM picks
     WHERE picks.player_id = players.id
       AND picks.is_strike = TRUE
   ),
   updated_at = NOW();
   ```

4. **Auto-eliminate players:**
   ```sql
   UPDATE players
   SET is_eliminated = TRUE,
       is_active = FALSE,
       updated_at = NOW()
   WHERE strikes >= (
     SELECT max_strikes FROM pool_settings WHERE season_year = players.season_year
   )
   AND has_bought_back = FALSE
   AND is_eliminated = FALSE;
   ```

**Why this approach?**
- Updates happen atomically in the database
- No need for application code to calculate strikes
- Guarantees consistency between games and standings
- Idempotent (can run multiple times safely due to `team_won IS NULL` check)

---

## Data Flow

### Automated Game Results Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     EVERY 2 HOURS                           │
│                   (During game windows)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE CRON JOB (pg_cron)                    │
│  Fires HTTP POST to Edge Function at scheduled times        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            EDGE FUNCTION: update-nfl-results                │
│  1. Auto-detect current week from weeks table               │
│  2. Fetch ESPN API scoreboard                               │
│  3. Parse game data (scores, status, winners)               │
│  4. UPSERT to nfl_games table                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               DATABASE: nfl_games table                     │
│  INSERT or UPDATE game rows with scores and status          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         TRIGGER: update_picks_from_game_result              │
│  Fires AFTER INSERT OR UPDATE when game_status = 'final'    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               DATABASE: picks table                         │
│  UPDATE team_won and is_strike for both teams               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               DATABASE: players table                       │
│  1. Recalculate strikes by counting is_strike = TRUE        │
│  2. Auto-eliminate if strikes >= max_strikes                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND DISPLAYS                          │
│  React components fetch updated data via Supabase client    │
│  Real-time updates visible to users                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Row Level Security (RLS)

All tables have RLS enabled with two policies:

### Public Read Access
```sql
CREATE POLICY "Public read access" ON table_name 
FOR SELECT 
USING (true);
```

**Purpose:** Anyone can view pool data (picks, standings, games)

### Service Role Full Access
```sql
CREATE POLICY "Service role full access" ON table_name 
FOR ALL 
USING (auth.role() = 'service_role');
```

**Purpose:** Backend operations (Edge Function, cron jobs) can write data

**Security Model:**
- Frontend uses `anon` key → read-only access
- Edge Function uses `service_role` key → full access
- Admin operations happen server-side with service role
- Users cannot directly manipulate data

---

## Indexes

Performance indexes for common queries:

```sql
CREATE INDEX idx_nfl_games_week ON nfl_games(week_id);
CREATE INDEX idx_nfl_games_espn_id ON nfl_games(espn_event_id);
CREATE INDEX idx_nfl_games_status ON nfl_games(game_status);
CREATE INDEX idx_picks_player ON picks(player_id);
CREATE INDEX idx_picks_week ON picks(week_id);
```

**Purpose:**
- Fast lookups by week
- Quick ESPN ID matching for upserts
- Efficient filtering by game status
- Player pick history queries
- Weekly pick displays

---

## Views

### game_results_view

Simplified view for querying game results with team names:

```sql
CREATE VIEW game_results_view AS
SELECT 
  g.id,
  w.week_number,
  w.season_year,
  ht.abbreviation as home_team,
  at.abbreviation as away_team,
  g.home_score,
  g.away_score,
  g.game_status,
  CASE 
    WHEN g.home_won THEN ht.abbreviation
    WHEN g.away_won THEN at.abbreviation
    ELSE NULL
  END as winner
FROM nfl_games g
JOIN weeks w ON g.week_id = w.id
JOIN nfl_teams ht ON g.home_team_id = ht.id
JOIN nfl_teams at ON g.away_team_id = at.id;
```

**Usage:**
```sql
-- See all Week 13 results
SELECT * FROM game_results_view 
WHERE week_number = 13 AND season_year = 2025;
```

---

## Data Integrity

### Referential Integrity
- All foreign keys have `ON DELETE CASCADE` where appropriate
- Deleting a player removes all their picks
- Deleting a week removes all games and picks for that week

### Constraints
- Unique constraints prevent duplicate picks
- Check constraints enforce valid values
- NOT NULL constraints ensure required data

### Automatic Timestamps
- All tables have `created_at` and `updated_at` (except those without updates)
- `updated_at` automatically set by triggers

---

## Backup and Recovery

### Automatic Backups
- Supabase performs daily backups automatically
- Retained for 7 days on free tier, 30 days on paid tiers

### Manual Backup
```sql
-- Export all data
COPY (SELECT * FROM players) TO '/tmp/players.csv' CSV HEADER;
COPY (SELECT * FROM picks) TO '/tmp/picks.csv' CSV HEADER;
-- etc. for each table
```

### Restore from Backup
- Download backup from Supabase Dashboard
- Use `psql` or SQL Editor to restore

---

## Performance Considerations

### Query Optimization
- Indexes on frequently queried columns
- Views for complex joins
- Efficient trigger logic (only updates what changed)

### Scalability
- Current design supports 50+ players easily
- Can scale to 500+ with minimal changes
- PostgreSQL handles millions of rows efficiently

### Monitoring
- Check slow queries: `SELECT * FROM pg_stat_statements ORDER BY total_time DESC;`
- Monitor trigger execution time in logs
- Watch Edge Function invocation counts

---

## Future Enhancements

### Potential Additions
- `playoff_picks` table for playoff bracket
- `historical_standings` table for season-end snapshots
- `notifications` table for email/SMS alerts
- `audit_log` table for admin actions
- `player_stats` view for career statistics

### Optimization Opportunities
- Materialized view for standings (refresh hourly)
- Partition `picks` table by season_year
- Add caching layer for frequently accessed data

---

## Conclusion

This database design prioritizes:
1. **Automation** - Triggers handle all strike calculations
2. **Integrity** - Constraints prevent invalid data
3. **Performance** - Indexes optimize common queries
4. **Simplicity** - Clear relationships and minimal complexity
5. **Scalability** - Designed to grow with the pool

The automated flow from ESPN API → database → frontend creates a hands-off experience for administrators while maintaining data accuracy and consistency.
