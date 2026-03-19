import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppProvider from '@/components/AppProvider'
import PWAProvider from '@/components/PWAProvider'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1c1e' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'FanTv',
  description: 'A modern dual-mode video application.',
  icons: { 
     icon: '/logo.png', 
     apple: '/icons/icon-192x192.png' 
  },
  appleWebApp: {
    capable: true,
    title: 'FanTv',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen`}>
        <PWAProvider />
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
