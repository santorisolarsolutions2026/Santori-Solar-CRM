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
  disabled?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
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
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-[var(--bg-card-solid)] border border-[var(--border-color)] hover:bg-[var(--border-color)]/30 rounded-xl text-xs text-left font-semibold text-[var(--text-primary)] transition-all flex items-center justify-between gap-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-700/40 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            selectedOption.badgeClass ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-350 border-none capitalize">
                {selectedOption.label}
              </span>
            ) : (
              <>
                {selectedOption.color && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }} />
                )}
                <span className="truncate font-semibold">{selectedOption.label}</span>
              </>
            )
          ) : (
            <span className="text-[var(--text-muted)] truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-black border border-slate-800/80 rounded-xl shadow-2xl overflow-hidden py-1 max-h-80 overflow-y-auto backdrop-blur-md animate-fade-in-up [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'text-white font-bold border-l-2 border-slate-500 hover:bg-slate-800'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.badgeClass ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-350 border-none capitalize">
                      {opt.label}
                    </span>
                  ) : (
                    <>
                      {opt.color && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
