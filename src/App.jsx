import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import WeeklyPicks from './pages/WeeklyPicks'
import AdminDashboard from './pages/AdminDashboard'
import AdminPlayers from './pages/AdminPlayers'
import AdminPicks from './pages/AdminPicks'
import AdminResults from './pages/AdminResults'

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
              <Link to="/" className="nav-link">Standings</Link>
              <Link to="/picks" className="nav-link">Weekly Picks</Link>
              <Link to="/admin" className="nav-link admin-link">Admin</Link>
            </div>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/picks" element={<WeeklyPicks />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/players" element={<AdminPlayers />} />
            <Route path="/admin/picks" element={<AdminPicks />} />
            <Route path="/admin/results" element={<AdminResults />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
