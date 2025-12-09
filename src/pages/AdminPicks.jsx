import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabaseAdmin } from '../lib/supabase'
import './AdminPicks.css'

function AdminPicks() {
  const [players, setPlayers] = useState([])
  const [weeks, setWeeks] = useState([])
  const [teams, setTeams] = useState([])
  const [picks, setPicks] = useState({}) // { playerId: { weekNumber: { team_id, team_abbreviation } } }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)
  const [editPreviousWeeksEnabled, setEditPreviousWeeksEnabled] = useState(false)
  const [currentWeekNumber, setCurrentWeekNumber] = useState(null)
  const [showCurrentWeekOnly, setShowCurrentWeekOnly] = useState(false)

  const currentYear = 2025

  function showNotification(message, type = 'success') {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)

      // Fetch all players for current season
      const { data: playersData, error: playersError } = await supabaseAdmin
        .from('players')
        .select('*')
        .eq('season_year', currentYear)
        .order('is_active', { ascending: false })
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (playersError) throw playersError

      // Fetch all weeks for current season
      const { data: weeksData, error: weeksError } = await supabaseAdmin
        .from('weeks')
        .select('*')
        .eq('season_year', currentYear)
        .order('week_number', { ascending: true })

      if (weeksError) throw weeksError

      // Fetch all NFL teams
      const { data: teamsData, error: teamsError } = await supabaseAdmin
        .from('nfl_teams')
        .select('*')
        .order('team_abbreviation', { ascending: true })

      if (teamsError) throw teamsError

      // Fetch all picks
      const { data: picksData, error: picksError } = await supabaseAdmin
        .from('picks')
        .select(`
          id,
          player_id,
          week_id,
          team_id,
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
          pick_id: pick.id,
          team_id: pick.team_id,
          team_abbreviation: pick.team?.team_abbreviation || '',
          week_id: pick.week_id
        }
      })

      // Determine current week based on today's date
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset to start of day for consistent comparison

      // First, try to find a week where today falls within the date range
      let currentWeek = weeksData?.find(week => {
        const startDate = new Date(week.start_date)
        const endDate = new Date(week.end_date)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
        return today >= startDate && today <= endDate
      })

      // If no exact match, find the next upcoming week (future week closest to today)
      if (!currentWeek) {
        currentWeek = weeksData?.find(week => {
          const startDate = new Date(week.start_date)
          startDate.setHours(0, 0, 0, 0)
          return startDate > today
        })
      }

      // If no future weeks, use the last week in the season
      if (!currentWeek && weeksData?.length > 0) {
        currentWeek = weeksData[weeksData.length - 1]
      }

      const currentWeekNum = currentWeek?.week_number || 1

      setCurrentWeekNumber(currentWeekNum)
      setPlayers(playersData || [])
      setWeeks(weeksData || [])
      setTeams(teamsData || [])
      setPicks(picksMap)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      showNotification('Error loading data: ' + error.message, 'error')
      setLoading(false)
    }
  }

  async function handlePickChange(playerId, weekNumber, weekId, teamId) {
    setSaving(true)

    try {
      const currentPick = picks[playerId]?.[weekNumber]

      if (!teamId) {
        // Delete pick if empty selection
        if (currentPick?.pick_id) {
          const { error } = await supabaseAdmin
            .from('picks')
            .delete()
            .eq('id', currentPick.pick_id)

          if (error) throw error

          // Update local state
          const newPicks = { ...picks }
          if (newPicks[playerId]) {
            delete newPicks[playerId][weekNumber]
          }
          setPicks(newPicks)
          showNotification('Pick removed')
        }
      } else {
        // Check if player has already used this team in a DIFFERENT week
        const hasUsedTeamInOtherWeek = Object.entries(picks[playerId] || {}).some(
          ([weekNum, pick]) => pick.team_id === teamId && parseInt(weekNum) !== weekNumber
        )

        if (hasUsedTeamInOtherWeek) {
          showNotification('Player has already used this team in another week!', 'error')
          setSaving(false)
          return
        }

        if (currentPick?.pick_id) {
          // Update existing pick
          const { error } = await supabaseAdmin
            .from('picks')
            .update({ team_id: teamId })
            .eq('id', currentPick.pick_id)

          if (error) throw error
        } else {
          // Insert new pick
          const { error } = await supabaseAdmin
            .from('picks')
            .insert([{
              player_id: playerId,
              week_id: weekId,
              team_id: teamId
            }])

          if (error) throw error
        }

        // Refresh data to get the updated pick
        await fetchData()
        showNotification('Pick saved!')
      }
    } catch (error) {
      console.error('Error saving pick:', error)
      showNotification('Error saving pick: ' + error.message, 'error')
    } finally {
      setSaving(false)
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

  function getAvailableTeams(playerId, currentWeekNumber) {
    // Get teams used in OTHER weeks (not the current week being edited)
    const usedTeamIds = Object.entries(picks[playerId] || {})
      .filter(([weekNum, pick]) => parseInt(weekNum) !== currentWeekNumber)
      .map(([_, pick]) => pick.team_id)

    return teams.filter(team => !usedTeamIds.includes(team.id))
  }

  function getPlayersWithMissingCurrentWeekPick() {
    if (!currentWeekNumber) return []

    return players.filter(player => {
      // Don't flag eliminated players as missing picks
      if (player.is_eliminated) return false

      const hasPick = picks[player.id]?.[currentWeekNumber]
      return !hasPick
    })
  }

  function getDisplayWeeks() {
    if (showCurrentWeekOnly && currentWeekNumber) {
      return weeks.filter(week => week.week_number === currentWeekNumber)
    }
    return weeks
  }

  if (loading) {
    return (
      <div className="admin-picks">
        <div className="admin-header">
          <Link to="/admin" className="back-link">← Back to Admin Dashboard</Link>
          <h1>Enter Picks</h1>
        </div>
        <p>Loading...</p>
      </div>
    )
  }

  const missingPicksPlayers = getPlayersWithMissingCurrentWeekPick()
  const displayWeeks = getDisplayWeeks()

  return (
    <div className="admin-picks">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="notification-close">×</button>
        </div>
      )}

      <div className="admin-header">
        <div>
          <Link to="/admin" className="back-link">← Back to Admin Dashboard</Link>
          <h1>Enter Picks</h1>
          <p className="subtitle">{currentYear} Season - Current Week: {currentWeekNumber}</p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowCurrentWeekOnly(!showCurrentWeekOnly)}
            className={`view-toggle-btn ${showCurrentWeekOnly ? 'active' : ''}`}
          >
            {showCurrentWeekOnly ? '📅 Show All Weeks' : '🎯 Current Week Only'}
          </button>
          <button
            onClick={() => setEditPreviousWeeksEnabled(!editPreviousWeeksEnabled)}
            className={`edit-previous-btn ${editPreviousWeeksEnabled ? 'active' : ''}`}
          >
            {editPreviousWeeksEnabled ? '🔓 Previous Weeks Unlocked' : '🔒 Edit Previous Weeks'}
          </button>
        </div>
      </div>

      {missingPicksPlayers.length > 0 && (
        <div className="missing-picks-alert">
          <div className="alert-header">
            <span className="alert-icon">⚠️</span>
            <strong>{missingPicksPlayers.length} player{missingPicksPlayers.length !== 1 ? 's' : ''} missing pick{missingPicksPlayers.length !== 1 ? 's' : ''} for Week {currentWeekNumber}</strong>
          </div>
          <div className="missing-players-list">
            {missingPicksPlayers.map(player => (
              <span key={player.id} className="missing-player-name">
                {getPlayerDisplayName(player)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="picks-container">
        <div className="table-wrapper">
          <table className="picks-table">
            <thead>
              <tr>
                <th className="sticky-col player-col">Player</th>
                <th className="sticky-col status-col">Status</th>
                {displayWeeks.map(week => (
                  <th
                    key={week.id}
                    className={`week-col ${week.week_number === currentWeekNumber ? 'current-week' : ''}`}
                  >
                    Week {week.week_number}
                    {week.week_number === currentWeekNumber && <span className="current-badge">Current</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const isEliminated = player.is_eliminated
                const isMissingCurrentWeekPick = !isEliminated && !picks[player.id]?.[currentWeekNumber]
                return (
                  <tr key={player.id} className={isEliminated ? 'eliminated-row' : ''}>
                    <td className="sticky-col player-col player-name">
                      {isMissingCurrentWeekPick && <span className="missing-pick-icon" title="Missing current week pick">⚠️</span>}
                      {getPlayerDisplayName(player)}
                    </td>
                    <td className="sticky-col status-col">
                      <span className={`status-badge ${isEliminated ? 'out' : 'alive'}`}>
                        {isEliminated ? 'Out' : 'Alive'}
                      </span>
                    </td>
                    {displayWeeks.map(week => {
                      const pick = picks[player.id]?.[week.week_number]
                      const availableTeams = getAvailableTeams(player.id, week.week_number)
                      const isPreviousWeek = week.week_number < currentWeekNumber
                      const isDisabled = saving || (isPreviousWeek && !editPreviousWeeksEnabled)

                      return (
                        <td
                          key={week.id}
                          className={`pick-cell ${week.week_number === currentWeekNumber ? 'current-week' : ''}`}
                        >
                          <select
                            value={pick?.team_id || ''}
                            onChange={(e) => handlePickChange(player.id, week.week_number, week.id, e.target.value)}
                            disabled={isDisabled}
                            className="team-select"
                          >
                            <option value="">-</option>
                            {availableTeams.map(team => (
                              <option key={team.id} value={team.id}>
                                {team.team_abbreviation}
                              </option>
                            ))}
                          </select>
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

      {players.length === 0 && (
        <div className="empty-state">
          <p>No players found. Add players in the Manage Players section first.</p>
          <Link to="/admin/players" className="add-players-link">
            Go to Manage Players
          </Link>
        </div>
      )}
    </div>
  )
}

export default AdminPicks
