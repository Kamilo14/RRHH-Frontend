import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getSlug } from '../services/httpClient'

interface TenantContextType {
  slug: string | null
  setSlug: (slug: string) => void
}

const TenantContext = createContext<TenantContextType>({} as TenantContextType)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [slug, setSlugState] = useState<string | null>(null)

  useEffect(() => {
    const savedSlug = getSlug()
    if (savedSlug) {
      setSlugState(savedSlug)
    }
  }, [])

  const setSlug = (newSlug: string) => {
    setSlugState(newSlug)
    localStorage.setItem('rrhh_empresa_slug', newSlug)
  }

  return (
    <TenantContext.Provider value={{ slug, setSlug }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
