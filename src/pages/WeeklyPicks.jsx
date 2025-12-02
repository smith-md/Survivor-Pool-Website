import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './WeeklyPicks.css'

function WeeklyPicks() {
  const [weeks, setWeeks] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeeks()
  }, [])

  useEffect(() => {
    if (selectedWeek) {
      fetchPicks(selectedWeek.id)
    }
  }, [selectedWeek])

  async function fetchWeeks() {
    try {
      const { data, error } = await supabase
        .from('weeks')
        .select('*')
        .order('week_number', { ascending: false })

      if (error) throw error

      setWeeks(data || [])
      if (data && data.length > 0) {
        setSelectedWeek(data[0]) // Select most recent week
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching weeks:', error)
      setLoading(false)
    }
  }

  async function fetchPicks(weekId) {
    try {
      const { data, error } = await supabase
        .from('picks')
        .select(`
          *,
          player:players(name, is_eliminated),
          team:nfl_teams(team_name, team_abbreviation)
        `)
        .eq('week_id', weekId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setPicks(data || [])
    } catch (error) {
      console.error('Error fetching picks:', error)
    }
  }

  if (loading) {
    return <div className="loading">Loading picks...</div>
  }

  return (
    <div className="weekly-picks-page">
      <h1>Weekly Picks</h1>

      <div className="week-selector">
        <label htmlFor="week-select">Select Week:</label>
        <select
          id="week-select"
          value={selectedWeek?.id || ''}
          onChange={(e) => {
            const week = weeks.find(w => w.id === e.target.value)
            setSelectedWeek(week)
          }}
        >
          {weeks.map((week) => (
            <option key={week.id} value={week.id}>
              Week {week.week_number} - {week.season_year}
              {week.is_complete ? ' (Complete)' : ' (In Progress)'}
            </option>
          ))}
        </select>
      </div>

      {selectedWeek && (
        <div className="picks-section">
          <h2>Week {selectedWeek.week_number} Picks</h2>
          
          {picks.length === 0 ? (
            <p className="no-picks">No picks entered for this week yet.</p>
          ) : (
            <div className="picks-grid">
              {picks.map((pick) => (
                <div 
                  key={pick.id} 
                  className={`pick-card ${pick.team_won === false ? 'loss' : ''} ${pick.team_won === true ? 'win' : ''}`}
                >
                  <div className="pick-player">
                    {pick.player?.name}
                    {pick.player?.is_eliminated && <span className="eliminated-badge">Eliminated</span>}
                  </div>
                  <div className="pick-team">
                    {pick.team?.team_abbreviation}
                  </div>
                  <div className="pick-result">
                    {pick.team_won === null && '⏳'}
                    {pick.team_won === true && '✅'}
                    {pick.team_won === false && '❌'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WeeklyPicks
