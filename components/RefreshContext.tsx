'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface RefreshContextType {
  refreshKey: number
  lastUpdated: string
  triggerRefresh: () => void
}

const RefreshContext = createContext<RefreshContextType>({
  refreshKey: 0,
  lastUpdated: '',
  triggerRefresh: () => {},
})

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastUpdated, setLastUpdated] = useState('')

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    setLastUpdated(new Date().toLocaleTimeString())
  }, [])

  return (
    <RefreshContext.Provider value={{ refreshKey, lastUpdated, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  )
}

export function useRefresh() {
  return useContext(RefreshContext)
}
