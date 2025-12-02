import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    // Redirect to login page if not authenticated
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export default ProtectedRoute
