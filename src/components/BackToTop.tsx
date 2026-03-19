'use client'
import { useState, useEffect } from 'react'
import { ArrowUpIcon } from '@heroicons/react/24/solid'

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = (scrollTop: number) => {
      // Show button when page is scrolled down 300px
      if (scrollTop > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // Listener for window scroll (most pages)
    const onWindowScroll = () => {
      handleScroll(window.scrollY)
    }

    // Listener for custom internal scrolls (e.g. play/page.tsx)
    const onCustomScroll = (e: Event) => {
      const customEvent = e as CustomEvent<number>
      handleScroll(customEvent.detail)
    }

    window.addEventListener('scroll', onWindowScroll, { passive: true })
    window.addEventListener('custom-scroll', onCustomScroll)
    return () => {
      window.removeEventListener('scroll', onWindowScroll)
      window.removeEventListener('custom-scroll', onCustomScroll)
    }
  }, [])

  const scrollToTop = () => {
    // Scroll window
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
    
    // Attempt to scroll internal containers if they exist
    const scrollContainer = document.getElementById('main-scroll-container')
    if (scrollContainer) {
       scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-24 md:bottom-12 right-6 md:right-12 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl transition-all duration-300 z-50 transform hover:scale-110 hidden md:flex ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'}`}
      aria-label="返回顶部"
    >
      <ArrowUpIcon className="w-6 h-6" />
    </button>
  )
}
