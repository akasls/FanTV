import { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let siteName = 'FanTv';
  let siteDescription = 'A modern dual-mode video application.';

  try {
     const setting = await prisma.systemSetting.findUnique({ where: { id: 'global' } })
     if (setting) {
        siteName = setting.siteName || siteName;
        siteDescription = setting.siteDescription || siteDescription;
     }
  } catch(e) {}

  return {
    name: siteName,
    short_name: siteName,
    description: siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#1c1c1e',
    theme_color: '#1c1c1e',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-256x256.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
