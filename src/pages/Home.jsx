import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Home.css'

function Home() {
  const [players, setPlayers] = useState([])
  const [weeks, setWeeks] = useState([])
  const [picks, setPicks] = useState({})
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activePlayers: 0,
    totalPot: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('season_year', 2025)

      if (playersError) throw playersError

      // Fetch all weeks
      const { data: weeksData, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('season_year', 2025)
        .order('week_number', { ascending: true })

      if (weeksError) throw weeksError

      // Fetch all picks
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select(`
          *,
          week:weeks!inner(week_number),
          team:nfl_teams(team_abbreviation)
        `)

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

      setStats({ totalPlayers, activePlayers, totalPot })
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

  if (loading) {
    return <div className="loading">Loading survivor pool data...</div>
  }

  return (
    <div className="home-page">
      <h1>Survivor Pool 2025</h1>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Players</h3>
          <p className="stat-number">{stats.totalPlayers}</p>
        </div>
        <div className="stat-card active">
          <h3>Still Alive</h3>
          <p className="stat-number">{stats.activePlayers}</p>
        </div>
        <div className="stat-card pot">
          <h3>Total Pot</h3>
          <p className="stat-number">${stats.totalPot}</p>
        </div>
      </div>

      <div className="picks-grid-container">
        <h2>Player Picks</h2>
        <div className="table-wrapper">
          <table className="picks-table">
            <thead>
              <tr>
                <th className="sticky-col player-col">Player</th>
                <th className="sticky-col strikes-col">Strikes</th>
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
                    <td className="sticky-col strikes-col">
                      <span className={`strikes strikes-${player.strikes}`}>
                        {player.strikes > 0 ? '❌'.repeat(player.strikes) : '-'}
                      </span>
                    </td>
                    {weeks.map(week => {
                      const pick = picks[player.id]?.[week.week_number]
                      return (
                        <td key={week.id} className={`pick-cell ${pick?.won === false ? 'loss' : ''} ${pick?.won === true ? 'win' : ''}`}>
                          {pick?.team || '-'}
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

export default Home
