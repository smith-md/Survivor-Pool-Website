import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminPicks.css'

function AdminPicks() {
  const [players, setPlayers] = useState([])
  const [weeks, setWeeks] = useState([])
  const [teams, setTeams] = useState([])
  const [picks, setPicks] = useState({}) // { playerId: { weekNumber: { team_id, team_abbreviation } } }
  const [pendingChanges, setPendingChanges] = useState({}) // Track unsaved changes
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
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('season_year', currentYear)
        .order('is_active', { ascending: false })
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (playersError) throw playersError

      // Fetch all weeks for current season
      const { data: weeksData, error: weeksError } = await supabase
        .from('weeks')
        .select('*')
        .eq('season_year', currentYear)
        .order('week_number', { ascending: true })

      if (weeksError) throw weeksError

      // Fetch all NFL teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('nfl_teams')
        .select('*')
        .order('team_abbreviation', { ascending: true })

      if (teamsError) throw teamsError

      // Fetch all picks
      const { data: picksData, error: picksError } = await supabase
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

  function handlePickChange(playerId, weekNumber, weekId, teamId) {
    // Check if player has already used this team in a DIFFERENT week
    if (teamId) {
      const hasUsedTeamInOtherWeek = Object.entries(picks[playerId] || {}).some(
        ([weekNum, pick]) => pick.team_id === teamId && parseInt(weekNum) !== weekNumber
      )

      if (hasUsedTeamInOtherWeek) {
        showNotification('Player has already used this team in another week!', 'error')
        return
      }
    }

    // Store the change locally without saving to database
    const changeKey = `${playerId}-${weekNumber}`
    setPendingChanges(prev => ({
      ...prev,
      [changeKey]: { playerId, weekNumber, weekId, teamId }
    }))

    // Update local picks state for immediate UI feedback
    const newPicks = { ...picks }
    if (!newPicks[playerId]) {
      newPicks[playerId] = {}
    }

    if (teamId) {
      const team = teams.find(t => t.id === teamId)
      newPicks[playerId][weekNumber] = {
        ...picks[playerId]?.[weekNumber],
        team_id: teamId,
        team_abbreviation: team?.team_abbreviation || ''
      }
    } else {
      // Mark for deletion
      if (newPicks[playerId][weekNumber]) {
        delete newPicks[playerId][weekNumber]
      }
    }

    setPicks(newPicks)
  }

  async function saveAllChanges() {
    if (Object.keys(pendingChanges).length === 0) {
      showNotification('No changes to save', 'error')
      return
    }

    setSaving(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const change of Object.values(pendingChanges)) {
        const { playerId, weekNumber, weekId, teamId } = change
        const currentPick = picks[playerId]?.[weekNumber]

        try {
          if (!teamId) {
            // Delete pick if empty selection
            if (currentPick?.pick_id) {
              const { error } = await supabase
                .from('picks')
                .delete()
                .eq('id', currentPick.pick_id)

              if (error) throw error
              successCount++
            }
          } else {
            if (currentPick?.pick_id) {
              // Update existing pick
              const { error } = await supabase
                .from('picks')
                .update({ team_id: teamId })
                .eq('id', currentPick.pick_id)

              if (error) throw error
              successCount++
            } else {
              // Insert new pick
              const { error } = await supabase
                .from('picks')
                .insert([{
                  player_id: playerId,
                  week_id: weekId,
                  team_id: teamId
                }])

              if (error) throw error
              successCount++
            }
          }
        } catch (error) {
          console.error('Error saving individual pick:', error)
          errorCount++
        }
      }

      // Refresh data after all saves
      await fetchData()
      setPendingChanges({})

      if (errorCount === 0) {
        showNotification(`Successfully saved ${successCount} pick${successCount !== 1 ? 's' : ''}!`)
      } else {
        showNotification(`Saved ${successCount} picks, ${errorCount} failed`, 'error')
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      showNotification('Error saving changes: ' + error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function discardChanges() {
    setPendingChanges({})
    // Reset picks to original state by refetching
    fetchData()
    showNotification('Changes discarded')
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
            {showCurrentWeekOnly ? 'Show All Weeks' : 'Current Week Only'}
          </button>
          <button
            onClick={() => setEditPreviousWeeksEnabled(!editPreviousWeeksEnabled)}
            className={`edit-previous-btn ${editPreviousWeeksEnabled ? 'active' : ''}`}
          >
            {editPreviousWeeksEnabled ? 'Previous Weeks Unlocked' : 'Edit Previous Weeks'}
          </button>
        </div>
      </div>

      {Object.keys(pendingChanges).length > 0 && (
        <div className="pending-changes-banner">
          <div className="pending-changes-content">
            <span className="pending-icon">⚠️</span>
            <strong>{Object.keys(pendingChanges).length} unsaved change{Object.keys(pendingChanges).length !== 1 ? 's' : ''}</strong>
          </div>
          <div className="pending-actions">
            <button onClick={discardChanges} className="discard-btn" disabled={saving}>
              Discard
            </button>
            <button onClick={saveAllChanges} className="save-all-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      )}

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
                    title={`Week ${week.week_number}${week.week_number === currentWeekNumber ? ' (Current)' : ''}`}
                  >
                    {week.week_number}
                    {week.week_number === currentWeekNumber && <span className="current-badge">*</span>}
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
