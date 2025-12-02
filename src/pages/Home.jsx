import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Home.css'

function Home() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activePlayers: 0,
    eliminated: 0
  })

  useEffect(() => {
    fetchPlayers()
  }, [])

  async function fetchPlayers() {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('strikes', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      setPlayers(data || [])
      
      // Calculate stats
      const totalPlayers = data?.length || 0
      const activePlayers = data?.filter(p => p.is_active && !p.is_eliminated).length || 0
      const eliminated = data?.filter(p => p.is_eliminated).length || 0
      
      setStats({ totalPlayers, activePlayers, eliminated })
      setLoading(false)
    } catch (error) {
      console.error('Error fetching players:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading standings...</div>
  }

  return (
    <div className="home-page">
      <h1>Survivor Pool Standings</h1>
      
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Players</h3>
          <p className="stat-number">{stats.totalPlayers}</p>
        </div>
        <div className="stat-card active">
          <h3>Still Alive</h3>
          <p className="stat-number">{stats.activePlayers}</p>
        </div>
        <div className="stat-card eliminated">
          <h3>Eliminated</h3>
          <p className="stat-number">{stats.eliminated}</p>
        </div>
      </div>

      <div className="standings-table">
        <h2>Current Standings</h2>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Strikes</th>
              <th>Status</th>
              <th>Bought Back</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className={player.is_eliminated ? 'eliminated-row' : ''}>
                <td>{player.name}</td>
                <td>
                  <span className={`strikes strikes-${player.strikes}`}>
                    {'❌'.repeat(player.strikes)}
                    {player.strikes === 0 && '✅'}
                  </span>
                </td>
                <td>
                  <span className={`status ${player.is_eliminated ? 'eliminated' : 'active'}`}>
                    {player.is_eliminated ? 'Eliminated' : 'Active'}
                  </span>
                </td>
                <td>{player.has_bought_back ? '✓' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Home
