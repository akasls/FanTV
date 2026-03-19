import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppProvider from '@/components/AppProvider'
import prisma from '@/lib/prisma'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  let siteName = 'FanTv';
  let siteDescription = 'A modern dual-mode video application.';
  let siteLogo = '';

  try {
     const setting = await prisma.systemSetting.findUnique({ where: { id: 'global' } })
     if (setting) {
        siteName = setting.siteName || siteName;
        siteDescription = setting.siteDescription || siteDescription;
        siteLogo = setting.siteLogo || siteLogo;
     }
  } catch(e) {}
  
  return {
    title: siteName,
    description: siteDescription,
    icons: siteLogo ? { icon: siteLogo } : undefined
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen`}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
