'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  variant?: 'default' | 'clean';
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  disabled = false,
  onOpenChange,
  variant = 'default',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const toggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (onOpenChange) {
      onOpenChange(nextOpen);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Listen to scroll and resize to re-position dropdown list dynamically
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = dropdownRef.current && dropdownRef.current.contains(target);
      const insidePortal = portalRef.current && portalRef.current.contains(target);

      if (!insideTrigger && !insidePortal) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isClean = variant === 'clean';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={
          isClean
            ? `w-full px-3 py-2 bg-white border border-black rounded-lg text-black text-xs font-semibold flex items-center justify-between gap-2 focus:outline-none transition-all cursor-pointer select-none ${
                isOpen ? 'ring-2 ring-[#97D7FF]/50 border-black' : 'hover:border-black'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
            : `w-full px-3 py-2 bg-[var(--bg-main)] border ${
                isOpen ? 'border-[#4F7D32]' : (buttonClassName || 'border-black dark:border-[var(--border-color)]')
              } hover:bg-[var(--border-color)]/30 rounded-lg text-xs text-left font-semibold text-[var(--text-primary)] transition-all flex items-center justify-between gap-2 shadow-xs focus:outline-none focus:border-[#4F7D32] ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`
        }
      >
        <span className={`truncate font-semibold ${isClean ? 'text-black' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isClean ? 'text-black' : 'text-black dark:text-white'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'absolute',
            top: `${coords.top + 4}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
          className={
            isClean
              ? "z-[100000] bg-white border border-black rounded-lg shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto animate-fade-in-up"
              : "z-[100000] bg-white dark:bg-[#0D1117] border border-black dark:border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden py-1 max-h-80 overflow-y-auto animate-fade-in-up"
          }
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            if (isClean) {
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    handleClose();
                  }}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors cursor-pointer select-none hover:bg-[#97D7FF] hover:text-black ${
                    isSelected
                      ? 'font-bold text-black'
                      : 'font-normal text-black'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              );
            }
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  handleClose();
                }}
                className={`w-full px-3 py-2 text-left text-xs transition-colors cursor-pointer select-none hover:bg-[#B8CFB3] hover:text-black dark:hover:bg-[#B8CFB3] dark:hover:text-black flex items-center justify-between ${
                  isSelected
                    ? 'font-bold text-black dark:text-white bg-[#B8CFB3]/40 dark:bg-[#B8CFB3]/30'
                    : 'font-normal text-black dark:text-gray-300'
                }`}
              >
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
