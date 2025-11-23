'use client'

import { Button } from './button'
import { cn } from '@/lib/utils'

interface SortOption {
  value: string
  label: string
}

interface SortButtonsProps {
  options: SortOption[]
  activeSort: string
  onSortChange: (sort: string) => void
  className?: string
}

export function SortButtons({ 
  options, 
  activeSort, 
  onSortChange, 
  className 
}: SortButtonsProps) {
  return (
    <div className={cn("flex space-x-1.5", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          onClick={() => onSortChange(option.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
            activeSort === option.value
              ? "bg-[#fb8678] text-white shadow-sm"
              : "bg-white text-gray-600 border border-[#fb8678]/20 hover:bg-[#fb8678]/5"
          )}
          variant="ghost"
          size="sm"
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

