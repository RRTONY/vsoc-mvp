import type { Metadata } from 'next'
import './globals.css'
import NavTabs from '@/components/NavTabs'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'Visual Chief of Staff · RampRate / ImpactSoul',
  description: 'Real-time command center for RampRate and ImpactSoul operations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <NavTabs />
          <main className="max-w-4xl mx-auto px-4 pb-16">{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}
