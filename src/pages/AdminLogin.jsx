import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminLogin.css'

function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // Check credentials against environment variables
    const correctUsername = import.meta.env.VITE_ADMIN_USERNAME || 'admin'
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'password'

    if (username === correctUsername && password === correctPassword) {
      // Store auth token in sessionStorage (cleared when browser closes)
      sessionStorage.setItem('adminAuth', 'true')
      sessionStorage.setItem('adminAuthTime', Date.now().toString())
      navigate('/admin')
    } else {
      setError('Invalid username or password')
      setPassword('')
    }
  }

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Admin Login</h1>
          <p className="login-subtitle">Survivor Pool Administration</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button">
              Login
            </button>
          </form>

          <div className="login-footer">
            <a href="/" className="back-link">← Back to Pool</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
