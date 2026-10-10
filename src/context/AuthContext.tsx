import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getMe, type MeResponse } from '../services/identityService'
import { getToken, clearAuth, saveAuth } from '../services/httpClient'

interface AuthContextType {
  user: MeResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, slug: string) => Promise<void>
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
      console.error('Error al obtener usuario:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = getToken()
    if (token) {
      refreshUser()
    } else {
      setIsLoading(false)
    }
  }, [refreshUser])

  const login = async (token: string, slug: string) => {
    saveAuth(token, slug)
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
