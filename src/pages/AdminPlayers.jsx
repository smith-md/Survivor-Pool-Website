import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabaseAdmin } from '../lib/supabase'
import './AdminPlayers.css'

function AdminPlayers() {
  const [currentPlayers, setCurrentPlayers] = useState([])
  const [previousPlayers, setPreviousPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notification, setNotification] = useState(null)
  const [newPlayer, setNewPlayer] = useState({
    first_name: '',
    last_name: '',
    entry_fee_paid: false
  })

  function showNotification(message, type = 'success') {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const currentYear = 2025

  useEffect(() => {
    fetchPlayers()
  }, [])

  async function fetchPlayers() {
    try {
      setLoading(true)

      // Fetch current season players
      const { data: current, error: currentError } = await supabaseAdmin
        .from('players')
        .select('*')
        .eq('season_year', currentYear)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (currentError) throw currentError
      setCurrentPlayers(current || [])

      // Fetch previous season players (who aren't in current season)
      const { data: allPrevious, error: previousError } = await supabaseAdmin
        .from('players')
        .select('first_name, last_name')
        .neq('season_year', currentYear)
        .order('last_name', { ascending: true })

      if (previousError) throw previousError

      // Remove duplicates and filter out players already in current season
      const uniquePrevious = []
      const seen = new Set()
      const currentPlayerNames = new Set(
        current?.map(p => `${p.first_name} ${p.last_name}`.toLowerCase()) || []
      )

      allPrevious?.forEach(p => {
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
        if (!seen.has(fullName) && !currentPlayerNames.has(fullName)) {
          seen.add(fullName)
          uniquePrevious.push(p)
        }
      })

      setPreviousPlayers(uniquePrevious)
    } catch (error) {
      console.error('Error fetching players:', error)
      showNotification('Error loading players: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddNewPlayer(e) {
    e.preventDefault()

    if (!newPlayer.first_name.trim() || !newPlayer.last_name.trim()) {
      showNotification('Please enter both first and last name', 'error')
      return
    }

    try {
      const { error } = await supabaseAdmin
        .from('players')
        .insert([{
          first_name: newPlayer.first_name.trim(),
          last_name: newPlayer.last_name.trim(),
          name: `${newPlayer.first_name.trim()} ${newPlayer.last_name.trim()}`,
          season_year: currentYear,
          entry_fee_paid: newPlayer.entry_fee_paid,
          is_active: true,
          is_eliminated: false,
          strikes: 0,
          has_bought_back: false
        }])

      if (error) throw error

      // Reset form and close modal
      setNewPlayer({ first_name: '', last_name: '', entry_fee_paid: false })
      setShowAddModal(false)

      // Refresh player list
      await fetchPlayers()

      showNotification('Player added successfully!')
    } catch (error) {
      console.error('Error adding player:', error)
      showNotification('Error adding player: ' + error.message, 'error')
    }
  }

  function handleEditClick(player) {
    setEditingPlayer({
      id: player.id,
      first_name: player.first_name,
      last_name: player.last_name,
      entry_fee_paid: player.entry_fee_paid,
      has_bought_back: player.has_bought_back
    })
  }

  async function handleUpdatePlayer(e) {
    e.preventDefault()

    if (!editingPlayer.first_name.trim() || !editingPlayer.last_name.trim()) {
      showNotification('Please enter both first and last name', 'error')
      return
    }

    try {
      const { error } = await supabaseAdmin
        .from('players')
        .update({
          first_name: editingPlayer.first_name.trim(),
          last_name: editingPlayer.last_name.trim(),
          name: `${editingPlayer.first_name.trim()} ${editingPlayer.last_name.trim()}`,
          entry_fee_paid: editingPlayer.entry_fee_paid,
          has_bought_back: editingPlayer.has_bought_back
        })
        .eq('id', editingPlayer.id)

      if (error) throw error

      // Close modal and refresh
      setEditingPlayer(null)
      await fetchPlayers()

      showNotification('Player updated successfully!')
    } catch (error) {
      console.error('Error updating player:', error)
      showNotification('Error updating player: ' + error.message, 'error')
    }
  }

  function handleDeleteClick() {
    setShowDeleteConfirm(true)
  }

  async function confirmDelete() {
    try {
      const { error } = await supabaseAdmin
        .from('players')
        .delete()
        .eq('id', editingPlayer.id)

      if (error) throw error

      // Close modals and refresh
      setShowDeleteConfirm(false)
      setEditingPlayer(null)
      await fetchPlayers()

      showNotification('Player deleted successfully!')
    } catch (error) {
      console.error('Error deleting player:', error)
      showNotification('Error deleting player: ' + error.message, 'error')
    }
  }

  async function handleAddPreviousPlayer(player) {
    if (!confirm(`Add ${player.first_name} ${player.last_name} to the ${currentYear} season?`)) {
      return
    }

    try {
      const { error } = await supabaseAdmin
        .from('players')
        .insert([{
          first_name: player.first_name,
          last_name: player.last_name,
          name: `${player.first_name} ${player.last_name}`,
          season_year: currentYear,
          entry_fee_paid: false,
          is_active: true,
          is_eliminated: false,
          strikes: 0,
          has_bought_back: false
        }])

      if (error) throw error

      // Refresh player list
      await fetchPlayers()

      showNotification('Player added successfully!')
    } catch (error) {
      console.error('Error adding player:', error)
      showNotification('Error adding player: ' + error.message, 'error')
    }
  }

  async function togglePaymentStatus(playerId, currentStatus) {
    try {
      const { error } = await supabaseAdmin
        .from('players')
        .update({ entry_fee_paid: !currentStatus })
        .eq('id', playerId)

      if (error) throw error

      // Update local state
      setCurrentPlayers(currentPlayers.map(p =>
        p.id === playerId ? { ...p, entry_fee_paid: !currentStatus } : p
      ))
    } catch (error) {
      console.error('Error updating payment status:', error)
      showNotification('Error updating payment status: ' + error.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="admin-players">
        <div className="admin-header">
          <Link to="/admin" className="back-link">← Back to Admin Dashboard</Link>
          <h1>Manage Players</h1>
        </div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="admin-players">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="notification-close">×</button>
        </div>
      )}

      <div className="admin-header">
        <div>
          <Link to="/admin" className="back-link">← Back to Admin Dashboard</Link>
          <h1>Manage Players</h1>
          <p className="subtitle">{currentYear} Season</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="add-button">
          + Add New Player
        </button>
      </div>

      <div className="current-players-section">
        <h2>Current Players ({currentPlayers.length})</h2>
        <div className="table-container">
          <table className="players-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Strikes</th>
                <th>Entry Fee Paid</th>
                <th>Bought Back</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPlayers.map(player => (
                <tr key={player.id}>
                  <td className="player-name">
                    {player.first_name} {player.last_name}
                  </td>
                  <td>
                    <span className={`status-badge ${player.is_eliminated ? 'eliminated' : 'active'}`}>
                      {player.is_eliminated ? 'Eliminated' : 'Active'}
                    </span>
                  </td>
                  <td>{player.strikes || 0}</td>
                  <td>
                    <button
                      className={`payment-toggle ${player.entry_fee_paid ? 'paid' : 'unpaid'}`}
                      onClick={() => togglePaymentStatus(player.id, player.entry_fee_paid)}
                    >
                      {player.entry_fee_paid ? '✓ Paid' : '✗ Unpaid'}
                    </button>
                  </td>
                  <td>{player.has_bought_back ? 'Yes' : 'No'}</td>
                  <td>
                    <button className="action-button" onClick={() => handleEditClick(player)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {previousPlayers.length > 0 && (
        <div className="previous-players-section">
          <h2>Previous Players (Quick Add)</h2>
          <p className="section-subtitle">Click to add a returning player from a previous season</p>
          <div className="previous-players-grid">
            {previousPlayers.map((player, index) => (
              <button
                key={index}
                className="previous-player-card"
                onClick={() => handleAddPreviousPlayer(player)}
              >
                <span className="player-name">{player.first_name} {player.last_name}</span>
                <span className="add-icon">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Player</h2>
              <button className="close-button" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddNewPlayer}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={newPlayer.first_name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, first_name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={newPlayer.last_name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newPlayer.entry_fee_paid}
                    onChange={(e) => setNewPlayer({ ...newPlayer, entry_fee_paid: e.target.checked })}
                  />
                  Entry Fee Paid
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPlayer && (
        <div className="modal-overlay" onClick={() => setEditingPlayer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Player</h2>
              <button className="close-button" onClick={() => setEditingPlayer(null)}>×</button>
            </div>
            <form onSubmit={handleUpdatePlayer}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={editingPlayer.first_name}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, first_name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={editingPlayer.last_name}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingPlayer.entry_fee_paid}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, entry_fee_paid: e.target.checked })}
                  />
                  Entry Fee Paid
                </label>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editingPlayer.has_bought_back}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, has_bought_back: e.target.checked })}
                  />
                  Has Bought Back
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={handleDeleteClick} className="delete-button">
                  Delete Player
                </button>
                <div className="modal-actions-right">
                  <button type="button" onClick={() => setEditingPlayer(null)} className="cancel-button">
                    Cancel
                  </button>
                  <button type="submit" className="submit-button">
                    Update Player
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && editingPlayer && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠️</div>
            <h2>Delete Player?</h2>
            <p className="confirm-message">
              Are you sure you want to delete <strong>{editingPlayer.first_name} {editingPlayer.last_name}</strong>?
            </p>
            <p className="confirm-warning">
              This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setShowDeleteConfirm(false)} className="confirm-cancel">
                Cancel
              </button>
              <button onClick={confirmDelete} className="confirm-delete">
                Delete Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPlayers
