import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../utils/auth'
import './AdminDashboard.css'

function AdminDashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">Manage your survivor pool</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="admin-cards">
        <Link to="/admin/players" className="admin-card">
          <div className="admin-card-icon">👥</div>
          <h3>Manage Players</h3>
          <p>Add, edit, or remove players. Track payments and strikes.</p>
        </Link>

        <Link to="/admin/picks" className="admin-card">
          <div className="admin-card-icon">📝</div>
          <h3>Enter Picks</h3>
          <p>Submit weekly picks for all players.</p>
        </Link>
      </div>
    </div>
  )
}

export default AdminDashboard
