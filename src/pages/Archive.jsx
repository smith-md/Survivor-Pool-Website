import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Home.css'

function Archive() {
  const [players, setPlayers] = useState([])
  const [weeks, setWeeks] = useState([])
  const [picks, setPicks] = useState({})
  const [loading, setLoading] = useState(true)
  const [availableSeasons, setAvailableSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activePlayers: 0,
    totalPot: 0,
    winner: null
  })

  useEffect(() => {
    fetchAvailableSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      fetchSeasonData(selectedSeason)
    }
  }, [selectedSeason])

  async function fetchAvailableSeasons() {
    try {
      const { data: seasonsData, error } = await supabase
        .from('weeks')
        .select('season_year')
        .order('season_year', { ascending: false })

      if (error) throw error

      const currentYear = new Date().getFullYear()
      const uniqueSeasons = [...new Set(seasonsData.map(w => w.season_year))]
        .filter(year => year < currentYear) // Only show completed seasons

      setAvailableSeasons(uniqueSeasons)

      // Auto-select the most recent completed season
      if (uniqueSeasons.length > 0) {
        setSelectedSeason(uniqueSeasons[0])
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
      setLoading(false)
    }
  }

  async function fetchSeasonData(season) {
    try {
      setLoading(true)

      // Fetch all players for selected season
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('season_year', season)

      if (playersError) throw playersError

      // Fetch all weeks for selected season
      const { data: weeksData, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('season_year', season)
        .order('week_number', { ascending: true })

      if (weeksError) throw weeksError

      // Fetch all picks
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select(`
          *,
          week:weeks!inner(week_number, season_year),
          team:nfl_teams(team_abbreviation)
        `)
        .eq('week.season_year', season)

      if (picksError) throw picksError

      // Organize picks by player and week
      const picksMap = {}
      picksData?.forEach(pick => {
        if (!picksMap[pick.player_id]) {
          picksMap[pick.player_id] = {}
        }
        picksMap[pick.player_id][pick.week.week_number] = {
          team: pick.team?.team_abbreviation,
          won: pick.team_won,
          isStrike: pick.is_strike
        }
      })

      // Sort players: Active first, then by strikes (ascending), then by name (ascending)
      const sortedPlayers = (playersData || []).sort((a, b) => {
        // First: Active players come before eliminated
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1
        }
        // Second: Sort by strikes (ascending - fewer strikes first)
        if (a.strikes !== b.strikes) {
          return a.strikes - b.strikes
        }
        // Third: Sort by first name alphabetically
        const nameA = (a.first_name || a.name || '').toLowerCase()
        const nameB = (b.first_name || b.name || '').toLowerCase()
        return nameA.localeCompare(nameB)
      })

      setPlayers(sortedPlayers)
      setWeeks(weeksData || [])
      setPicks(picksMap)

      // Calculate stats
      const totalPlayers = playersData?.length || 0
      const activePlayers = playersData?.filter(p => p.is_active && !p.is_eliminated).length || 0

      // Calculate total pot (entry fees + buyback fees)
      const entryFeesTotal = playersData?.filter(p => p.entry_fee_paid).length * 30 || 0
      const buybackFeesTotal = playersData?.filter(p => p.has_bought_back).length * 20 || 0
      const totalPot = entryFeesTotal + buybackFeesTotal

      // Find winner (if season is complete - only 1 or 0 active players left)
      let winner = null
      if (activePlayers === 1) {
        winner = sortedPlayers.find(p => p.is_active && !p.is_eliminated)
      }

      setStats({ totalPlayers, activePlayers, totalPot, winner })
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  function getPlayerDisplayName(player) {
    if (player.first_name) {
      return player.last_name
        ? `${player.first_name} ${player.last_name}`
        : player.first_name
    }
    return player.name || 'Unknown'
  }

  function getTeamLogoUrl(teamAbbreviation) {
    if (!teamAbbreviation) return null
    // ESPN's public CDN for NFL team logos
    return `https://a.espncdn.com/i/teamlogos/nfl/500/${teamAbbreviation}.png`
  }

  if (availableSeasons.length === 0 && !loading) {
    return (
      <div className="home-page">
        <h1>Archive</h1>
        <p>No archived seasons available yet.</p>
      </div>
    )
  }

  if (loading) {
    return <div className="loading">Loading archived season data...</div>
  }

  return (
    <div className="home-page">
      <div className="archive-header">
        <h1>Survivor Pool Archive</h1>
        <div className="season-selector">
          <label htmlFor="season-select">Season:</label>
          <select
            id="season-select"
            value={selectedSeason || ''}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="season-dropdown"
          >
            {availableSeasons.map(season => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>
      </div>

      {stats.winner && (
        <div className="winner-banner">
          <h2>🏆 {selectedSeason} Champion: {getPlayerDisplayName(stats.winner)} 🏆</h2>
        </div>
      )}

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon people">👥</div>
          <div className="stat-content">
            <h3>Total Participants</h3>
            <p className="stat-number">{stats.totalPlayers}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alive">💚</div>
          <div className="stat-content">
            <h3>Finished Alive</h3>
            <p className="stat-number">{stats.activePlayers}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pot">💰</div>
          <div className="stat-content">
            <h3>Total Pot</h3>
            <p className="stat-number">${stats.totalPot}</p>
          </div>
        </div>
      </div>

      <div className="picks-grid-container">
        <h2>Player Picks</h2>
        <div className="table-wrapper">
          <table className="picks-table">
            <thead>
              <tr>
                <th className="sticky-col player-col">Player</th>
                <th className="sticky-col status-col">Status</th>
                {weeks.map(week => (
                  <th key={week.id} className="week-col">
                    W{week.week_number}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const isEliminated = player.is_eliminated
                return (
                  <tr key={player.id} className={isEliminated ? 'eliminated-row' : ''}>
                    <td className="sticky-col player-col player-name">
                      {getPlayerDisplayName(player)}
                    </td>
                    <td className="sticky-col status-col">
                      <span className={`status-badge ${isEliminated ? 'out' : 'alive'}`}>
                        {isEliminated ? 'Out' : 'Alive'}
                      </span>
                    </td>
                    {weeks.map(week => {
                      const pick = picks[player.id]?.[week.week_number]
                      const logoUrl = pick?.team ? getTeamLogoUrl(pick.team) : null
                      return (
                        <td key={week.id} className={`pick-cell ${pick?.won === false ? 'loss' : ''} ${pick?.won === true ? 'win' : ''}`}>
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={pick.team}
                              title={pick.team}
                              className="team-logo"
                              onError={(e) => {
                                // Fallback to text if logo fails to load
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'inline'
                              }}
                            />
                          ) : null}
                          <span className="pick-team" style={{ display: logoUrl ? 'none' : 'inline' }}>
                            {pick?.team || '-'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Archive
