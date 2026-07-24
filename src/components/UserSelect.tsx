'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';

export interface UserOption {
  id: number | string;
  name: string;
  email?: string;
  role?: string;
  designation?: string | { name: string };
  photograph?: string | null;
}

interface UserSelectProps {
  users: UserOption[];
  value: number | string | null | undefined;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function UserSelect({
  users = [],
  value,
  onChange,
  placeholder = 'Select Team Member...',
  disabled = false,
  className = '',
}: UserSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected user
  const selectedUser = users.find((u) => String(u.id) === String(value));

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const desName = typeof u.designation === 'object' ? u.designation?.name : u.designation;
    return (
      u.name.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (desName && desName.toLowerCase().includes(term))
    );
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDesignationText = (u: UserOption) => {
    if (typeof u.designation === 'object' && u.designation?.name) return u.designation.name;
    if (typeof u.designation === 'string' && u.designation) return u.designation;
    if (u.role) return u.role.toUpperCase();
    return 'Staff';
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-2 px-3 rounded-lg border text-left flex items-center justify-between gap-2 transition-all outline-none cursor-pointer text-xs ${
          disabled
            ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
            : isOpen
            ? 'bg-slate-950 border-amber-500 ring-1 ring-amber-500/30 text-white'
            : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedUser ? (
            <>
              <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 uppercase">
                {selectedUser.name.charAt(0)}
              </div>
              <span className="font-semibold text-white truncate">{selectedUser.name}</span>
              <span className="text-[9px] bg-slate-900 border border-slate-800 text-amber-400/90 px-1.5 py-0.2 rounded font-mono truncate hidden sm:inline-block">
                {getDesignationText(selectedUser)}
              </span>
            </>
          ) : (
            <span className="text-slate-500 italic">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedUser && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="p-0.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#111625] border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-800 bg-slate-955/60 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-4 top-3.5" />
            <input
              type="text"
              autoFocus
              placeholder="Search by name, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-lg text-xs text-white placeholder-slate-500"
            />
          </div>

          {/* User List */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-850/40 custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 italic">
                No matching team members
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = String(u.id) === String(value);
                const des = getDesignationText(u);

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onChange(u.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full p-2 text-left rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 text-white font-bold border border-amber-500/20'
                        : 'hover:bg-slate-900/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block truncate">{u.name}</span>
                        {u.email && <span className="text-[10px] text-slate-500 block truncate">{u.email}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] bg-slate-900 border border-slate-800 text-amber-400/90 px-1.5 py-0.5 rounded font-mono">
                        {des}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
