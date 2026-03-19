'use client'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '@/store/useAppStore'

export default function ThemeToggle() {
    const { theme, setTheme } = useAppStore()

    const cycleTheme = () => {
        if (theme === 'system') setTheme('light')
        else if (theme === 'light') setTheme('dark')
        else setTheme('system')
    }

    return (
        <button 
            onClick={cycleTheme} 
            className="flex items-center justify-center p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title={`当前主题：${theme === 'system' ? '跟随系统' : theme === 'light' ? '日间模式' : '夜间模式'}`}
        >
            {theme === 'light' && <SunIcon className="w-5 h-5 text-amber-500" />}
            {theme === 'dark' && <MoonIcon className="w-5 h-5 text-blue-400" />}
            {theme === 'system' && <ComputerDesktopIcon className="w-5 h-5 text-gray-500" />}
        </button>
    )
}
