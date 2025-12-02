import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminPlayers from './pages/AdminPlayers'
import AdminPicks from './pages/AdminPicks'
import AdminResults from './pages/AdminResults'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              🏈 NFL Survivor Pool
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Pool</Link>
              <Link to="/admin" className="nav-link admin-link">Admin</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/players" element={<ProtectedRoute><AdminPlayers /></ProtectedRoute>} />
            <Route path="/admin/picks" element={<ProtectedRoute><AdminPicks /></ProtectedRoute>} />
            <Route path="/admin/results" element={<ProtectedRoute><AdminResults /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
