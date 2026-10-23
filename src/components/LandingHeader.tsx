'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LandingHeaderProps {
  portalLink?: string;
  showButton?: boolean;
}

export default function LandingHeader({ 
  portalLink = '/dashboard', 
  showButton = true 
}: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        isScrolled 
          ? 'border-white/20 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.2),0_8px_10px_-6px_rgba(0,0,0,0.15)]' 
          : 'border-white/15 shadow-none'
      }`}
      style={{ 
        background: 'linear-gradient(110deg, #0e876a 0%, #1a7e8b 26%, #2874af 58%, #c79522 100%)' 
      }}
    >
      <div className="w-full px-6 sm:px-10 lg:px-14 h-16 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-7 h-7 overflow-hidden rounded-md flex items-center justify-center bg-white p-0.5 shadow-xs">
            <Image 
              src="/logo.png" 
              alt="Santori Solar Logo" 
              width={28} 
              height={28} 
              className="object-contain"
              priority
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Santori Solar CRM
          </span>
        </div>

        {showButton && (
          <div>
            <Link 
              href={portalLink}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-slate-900 hover:bg-slate-100 shadow-xs transition-colors flex items-center gap-1.5"
            >
              Launch CRM Portal →
            </Link>
          </div>
        )}
      </div>

      {/* Subtle fade strip underneath the header on scroll */}
      <div 
        className={`absolute left-0 right-0 top-full h-9 pointer-events-none transition-opacity duration-300 ${
          isScrolled ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.05) 50%, transparent 100%)',
        }}
      />
    </header>
  );
}
