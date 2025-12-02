// Simple authentication utility for admin access

export function isAuthenticated() {
  const auth = sessionStorage.getItem('adminAuth')
  const authTime = sessionStorage.getItem('adminAuthTime')

  if (!auth || !authTime) {
    return false
  }

  // Check if session is still valid (24 hours)
  const twentyFourHours = 24 * 60 * 60 * 1000
  const isExpired = Date.now() - parseInt(authTime) > twentyFourHours

  if (isExpired) {
    logout()
    return false
  }

  return auth === 'true'
}

export function logout() {
  sessionStorage.removeItem('adminAuth')
  sessionStorage.removeItem('adminAuthTime')
}
