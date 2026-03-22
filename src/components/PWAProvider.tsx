'use client'
import { useEffect } from 'react'

export default function PWAProvider() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(
          function (registration) {
            // Service worker successfully registered
          },
          function (err) {
            // Service worker registration failed
          }
        )
      })
    }
  }, [])
  
  return null
}
