import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'text'
  theme?: 'light' | 'dark'
}

const sizeMap = {
  sm: { width: 24, height: 24, textSize: 'text-sm' },
  md: { width: 32, height: 32, textSize: 'text-base' },
  lg: { width: 48, height: 48, textSize: 'text-lg' },
  xl: { width: 64, height: 64, textSize: 'text-xl' },
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'md', 
  variant = 'full',
  theme = 'light'
}) => {
  const { width, height, textSize } = sizeMap[size]
  
  const logoIcon = (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-shrink-0", className)}
    >
      <defs>
        <linearGradient id="agileforge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="agileforge-gradient-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      
      {/* Background Circle */}
      <circle
        cx="24"
        cy="24"
        r="20"
        fill={theme === 'dark' ? 'url(#agileforge-gradient-dark)' : 'url(#agileforge-gradient)'}
        className="drop-shadow-sm"
      />
      
      {/* Agile Sprint Symbol - Stylized "A" */}
      <path
        d="M24 8 L32 28 L28 28 L26.5 24 L21.5 24 L20 28 L16 28 L24 8 Z M23 18 L25 18 L24 15 L23 18 Z"
        fill="white"
        className="drop-shadow-sm"
      />
      
      {/* Forge/Hammer Element */}
      <path
        d="M32 30 L36 34 L34 36 L30 32 L32 30 Z"
        fill="white"
        className="drop-shadow-sm"
      />
      
      {/* Sprint Dots */}
      <circle cx="12" cy="36" r="2" fill="white" opacity="0.8" />
      <circle cx="16" cy="38" r="1.5" fill="white" opacity="0.6" />
      <circle cx="20" cy="40" r="1" fill="white" opacity="0.4" />
    </svg>
  )

  const logoText = (
    <span className={cn(
      "font-bold font-sans tracking-tight",
      textSize,
      theme === 'dark' ? 'text-white' : 'text-slate-900'
    )}>
      <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
        Agile
      </span>
      <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}>
        Forge
      </span>
    </span>
  )

  if (variant === 'icon') {
    return logoIcon
  }

  if (variant === 'text') {
    return logoText
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {logoIcon}
      {logoText}
    </div>
  )
}

export default Logo 