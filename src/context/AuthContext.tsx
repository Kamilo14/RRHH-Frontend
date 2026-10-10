import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getMe, type MeResponse } from '../services/identityService'
import { getToken, clearAuth } from '../services/httpClient'

interface AuthContextType {
  user: MeResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!getToken()

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMe()
      setUser(userData)
    } catch (error) {
      setUser(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = getToken()
    if (token) {
      refreshUser().catch(() => undefined)
    } else {
      setIsLoading(false)
    }
  }, [refreshUser])

  const login = async () => {
    await refreshUser()
  }

  const logout = () => {
    clearAuth()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
