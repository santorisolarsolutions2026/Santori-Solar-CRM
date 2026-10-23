'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  badgeClass?: string;
  color?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  disabled?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  buttonStyle,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${isOpen ? 'z-50' : ''} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyle}
        className={`w-full px-3 py-2 bg-[var(--bg-main)] border ${
          isOpen ? 'border-[#4F7D32]' : (buttonClassName || 'border-black dark:border-[var(--border-color)]')
        } hover:bg-[var(--border-color)]/30 rounded-lg text-xs text-left font-semibold text-[var(--text-primary)] transition-all flex items-center justify-between gap-2 shadow-xs focus:outline-none focus:border-[#4F7D32] ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <span className="truncate font-semibold">{selectedOption.label}</span>
          ) : (
            <span className="text-[var(--text-muted)] truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-black dark:text-white transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-[#0D1117] border border-black dark:border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden py-1 max-h-80 overflow-y-auto animate-fade-in-up">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs transition-colors cursor-pointer select-none hover:bg-[#B8CFB3] hover:text-black dark:hover:bg-[#B8CFB3] dark:hover:text-black flex items-center justify-between ${
                  isSelected
                    ? 'font-bold bg-[#B8CFB3] text-black dark:text-black'
                    : 'font-normal text-black dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.color && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
