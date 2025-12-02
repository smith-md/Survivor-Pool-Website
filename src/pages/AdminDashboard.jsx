import { Link } from 'react-router-dom'
import './AdminDashboard.css'

function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <p className="admin-subtitle">Manage your survivor pool</p>

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

        <Link to="/admin/results" className="admin-card">
          <div className="admin-card-icon">🏆</div>
          <h3>Mark Results</h3>
          <p>Update game results and calculate standings.</p>
        </Link>
      </div>

      <div className="admin-note">
        <p>⚠️ Admin functions coming soon. These pages will allow you to manage all aspects of your survivor pool.</p>
      </div>
    </div>
  )
}

export default AdminDashboard
