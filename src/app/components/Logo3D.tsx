'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';

interface Logo3DProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
}

export default function Logo3D({
  src = '/logo.png',
  alt = 'Santori Solar Solutions Logo',
  size = 96,
  className = '',
}: Logo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate cursor position relative to element center (-0.5 to 0.5)
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;
    
    // Calculate tilt angles (max +-22 deg)
    const rotateY = mouseX * 45;
    const rotateX = -mouseY * 45;
    
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative cursor-pointer select-none group/logo3d ${className}`}
      style={{ perspective: '1200px' }}
    >
      {/* Ambient 3D Shadow Glow */}
      <div 
        className="absolute inset-0 bg-emerald-500/25 rounded-3xl blur-2xl transition-all duration-500 pointer-events-none opacity-60 group-hover/logo3d:opacity-90 group-hover/logo3d:blur-3xl"
        style={{
          transform: isHovered 
            ? `rotateX(${rotate.x * 0.5}deg) rotateY(${rotate.y * 0.5}deg) translateZ(-30px) scale(1.15)` 
            : 'translateZ(-30px)',
        }}
      />

      {/* Main 3D Card Container */}
      <div
        className="relative flex items-center justify-center p-4 rounded-3xl bg-white/95 dark:bg-[#161B22]/90 border border-white/40 dark:border-emerald-500/30 shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out overflow-hidden"
        style={{
          width: `${size + 40}px`,
          height: `${size + 40}px`,
          transformStyle: 'preserve-3d',
          transform: isHovered
            ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(20px) scale(1.05)`
            : 'rotateX(0deg) rotateY(0deg) translateZ(0px)',
        }}
      >
        {/* Dynamic Specular Light Glare Layer */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-0 group-hover/logo3d:opacity-100 bg-gradient-to-tr from-transparent via-white/20 dark:via-emerald-400/15 to-transparent"
          style={{
            transform: `translate3d(${rotate.y * 2}px, ${-rotate.x * 2}px, 10px)`,
          }}
        />

        {/* 3D Floating Logo Image */}
        <div
          className="relative transition-transform duration-300 ease-out"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            transformStyle: 'preserve-3d',
            transform: isHovered ? 'translateZ(40px) scale(1.08)' : 'translateZ(10px)',
          }}
        >
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="w-full h-full object-contain filter drop-shadow-2xl animate-float"
            priority
          />
        </div>

        {/* Outer Ring Ambient Glow */}
        <div
          className="absolute inset-0 rounded-3xl border border-emerald-500/0 group-hover/logo3d:border-emerald-500/40 transition-all duration-500 pointer-events-none"
          style={{
            transform: 'translateZ(15px)',
          }}
        />
      </div>
    </div>
  );
}
