'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ToastContextType {
  toast: (msg: string) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)

  const toast = useCallback((message: string) => {
    setMsg(message)
    setVisible(true)
    setTimeout(() => setVisible(false), 2800)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-sand text-sm font-bold px-5 py-3 z-50 transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {msg}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
