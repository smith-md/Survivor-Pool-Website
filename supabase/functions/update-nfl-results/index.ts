// Supabase Edge Function to fetch NFL results from ESPN and update database
// Based on your existing Google Apps Script logic

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SEASON = 2025
const SEASON_TYPE = 2 // 1=PRE, 2=REG, 3=POST

interface ESPNCompetitor {
  homeAway: string
  team: {
    abbreviation: string
    id: string
  }
  score?: string
  winner?: boolean
}

interface ESPNCompetition {
  competitors: ESPNCompetitor[]
  status: {
    type: {
      completed: boolean
    }
  }
}

interface ESPNEvent {
  id: string
  date: string
  status: {
    type: {
      completed: boolean
    }
  }
  competitions: ESPNCompetition[]
}

interface ESPNResponse {
  events: ESPNEvent[]
}

Deno.serve(async (req) => {
  try {
    // Initialize Supabase client with service role key (for write access)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the week to check from query params, or detect current week
    const url = new URL(req.url)
    let weekToCheck = parseInt(url.searchParams.get('week') || '0')
    
    if (!weekToCheck) {
      weekToCheck = await getCurrentWeek(supabaseClient)
      console.log(`Auto-detected current week: ${weekToCheck}`)
    }

    if (!weekToCheck) {
      return new Response(
        JSON.stringify({ error: 'Could not determine current week' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch scoreboard data from ESPN
    const events = await fetchScoreboard(SEASON, weekToCheck, SEASON_TYPE)
    console.log(`Fetched ${events.length} games for week ${weekToCheck}`)

    if (events.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No games found for this week' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the week_id from database
    const { data: weekData, error: weekError } = await supabaseClient
      .from('weeks')
      .select('id')
      .eq('week_number', weekToCheck)
      .eq('season_year', SEASON)
      .single()

    if (weekError || !weekData) {
      return new Response(
        JSON.stringify({ error: `Week ${weekToCheck} not found in database` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const weekId = weekData.id

    let gamesUpdated = 0
    let gamesCreated = 0
    const failedGames: Array<{ matchup: string; reason: string; espnId: string }> = []
    const successfulGames: Array<{ matchup: string; status: string }> = []

    // Process each game
    for (const event of events) {
      const comp = event.competitions?.[0]
      if (!comp || !comp.competitors) {
        failedGames.push({
          matchup: `ESPN Event ${event.id}`,
          reason: 'Missing competition or competitors data',
          espnId: event.id
        })
        continue
      }

      // Find home and away teams
      const homeTeam = comp.competitors.find(c => c.homeAway === 'home')
      const awayTeam = comp.competitors.find(c => c.homeAway === 'away')

      if (!homeTeam || !awayTeam) {
        failedGames.push({
          matchup: `ESPN Event ${event.id}`,
          reason: 'Missing home or away team data',
          espnId: event.id
        })
        continue
      }

      const homeAbbr = homeTeam.team.abbreviation
      const awayAbbr = awayTeam.team.abbreviation
      const matchup = `${awayAbbr} @ ${homeAbbr}`

      // Get team IDs from database with error handling
      const { data: homeTeamData, error: homeTeamError } = await supabaseClient
        .from('nfl_teams')
        .select('id')
        .eq('team_abbreviation', homeAbbr)
        .single()

      const { data: awayTeamData, error: awayTeamError } = await supabaseClient
        .from('nfl_teams')
        .select('id')
        .eq('team_abbreviation', awayAbbr)
        .single()

      if (!homeTeamData || homeTeamError) {
        console.error(`❌ Team lookup failed for ${homeAbbr}:`, homeTeamError?.message || 'Not found')
        failedGames.push({
          matchup,
          reason: `Home team "${homeAbbr}" not found in database`,
          espnId: event.id
        })
        continue
      }

      if (!awayTeamData || awayTeamError) {
        console.error(`❌ Team lookup failed for ${awayAbbr}:`, awayTeamError?.message || 'Not found')
        failedGames.push({
          matchup,
          reason: `Away team "${awayAbbr}" not found in database`,
          espnId: event.id
        })
        continue
      }

      // Determine game status and winner
      const isCompleted = comp.status?.type?.completed || false
      const homeScore = parseInt(homeTeam.score || '0')
      const awayScore = parseInt(awayTeam.score || '0')
      const homeWon = homeTeam.winner === true
      const awayWon = awayTeam.winner === true

      const gameStatus = isCompleted ? 'final' : 'in_progress'

      // Upsert game data
      const { error: upsertError } = await supabaseClient
        .from('nfl_games')
        .upsert({
          espn_event_id: event.id,
          week_id: weekId,
          home_team_id: homeTeamData.id,
          away_team_id: awayTeamData.id,
          home_score: homeScore,
          away_score: awayScore,
          home_won: homeWon,
          away_won: awayWon,
          game_status: gameStatus,
          game_date: event.date,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'espn_event_id'
        })

      if (upsertError) {
        console.error(`❌ Error upserting game ${matchup}:`, upsertError.message)
        failedGames.push({
          matchup,
          reason: `Database upsert failed: ${upsertError.message}`,
          espnId: event.id
        })
        continue
      }

      // Check if this was an insert or update
      const { data: checkGame } = await supabaseClient
        .from('nfl_games')
        .select('created_at, updated_at')
        .eq('espn_event_id', event.id)
        .single()

      if (checkGame && checkGame.created_at === checkGame.updated_at) {
        gamesCreated++
        console.log(`✅ Created game: ${matchup} - ${gameStatus} (${awayScore}-${homeScore})`)
        successfulGames.push({ matchup, status: 'created' })
      } else {
        gamesUpdated++
        console.log(`✅ Updated game: ${matchup} - ${gameStatus} (${awayScore}-${homeScore})`)
        successfulGames.push({ matchup, status: 'updated' })
      }
    }

    const totalProcessed = gamesCreated + gamesUpdated
    const success = failedGames.length === 0

    return new Response(
      JSON.stringify({
        success,
        week: weekToCheck,
        games_from_espn: events.length,
        games_created: gamesCreated,
        games_updated: gamesUpdated,
        games_saved: totalProcessed,
        games_failed: failedGames.length,
        successful_games: successfulGames,
        failed_games: failedGames,
        message: failedGames.length === 0
          ? `Successfully processed all ${totalProcessed} games for week ${weekToCheck}`
          : `Processed ${totalProcessed} games, ${failedGames.length} failed for week ${weekToCheck}`
      }),
      {
        status: failedGames.length === 0 ? 200 : 207, // 207 = Multi-Status (partial success)
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Fetch scoreboard data from ESPN API (same logic as your Google Script)
async function fetchScoreboard(season: number, week: number, seasonType: number): Promise<ESPNEvent[]> {
  const base = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
  const url = `${base}?seasontype=${seasonType}&week=${week}&dates=${season}`
  
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`ESPN API returned ${response.status}`)
      return []
    }
    
    const json: ESPNResponse = await response.json()
    return json.events || []
  } catch (error) {
    console.error('Error fetching scoreboard:', error)
    return []
  }
}

// Detect current week by checking which week has recent games
async function getCurrentWeek(supabase: any): Promise<number> {
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000))
  
  // Query weeks that have start dates within the last 3 days
  const { data: recentWeeks } = await supabase
    .from('weeks')
    .select('week_number')
    .eq('season_year', SEASON)
    .gte('start_date', threeDaysAgo.toISOString().split('T')[0])
    .lte('start_date', now.toISOString().split('T')[0])
    .order('week_number', { ascending: false })
    .limit(1)

  if (recentWeeks && recentWeeks.length > 0) {
    return recentWeeks[0].week_number
  }

  // Fallback: find the most recent week that's started
  const { data: currentWeek } = await supabase
    .from('weeks')
    .select('week_number')
    .eq('season_year', SEASON)
    .lte('start_date', now.toISOString().split('T')[0])
    .order('week_number', { ascending: false })
    .limit(1)

  return currentWeek?.[0]?.week_number || 1
}
