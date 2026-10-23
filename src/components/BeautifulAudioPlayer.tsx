'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Loader2, Download } from 'lucide-react';

interface BeautifulAudioPlayerProps {
  src: string;
  defaultDuration?: number | null;
}

export function BeautifulAudioPlayer({ src, defaultDuration }: BeautifulAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(defaultDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  // Reset player state during render when source changes (idiomatic React pattern)
  if (src !== prevSrc) {
    setPrevSrc(src);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(defaultDuration || 0);
    setIsLoading(false);
    setPlaybackRate(1);
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.playbackRate = playbackRate;
    }
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // If at or near the end, restart from beginning
      if (duration > 0 && (currentTime >= duration || audioRef.current.ended || audioRef.current.currentTime >= duration - 0.1)) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      audioRef.current.play().catch((err) => {
        console.error('Playback error:', err);
        setIsLoading(false);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    if (duration > 0 && cur >= duration) {
      setCurrentTime(duration);
    } else {
      setCurrentTime(cur);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (isFinite(d) && !isNaN(d) && d > 0) {
      setDuration(d);
    }
    setIsLoading(false);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newVol = parseFloat(e.target.value);
    audioRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().catch((err) => console.error(err));
  };

  const handlePlaybackRateChange = () => {
    if (!audioRef.current) return;
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.25;
    else if (playbackRate === 1.25) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-md transition-all w-full">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => setIsLoading(false)}
        onCanPlayThrough={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onEnded={() => {
          setIsPlaying(false);
          if (duration > 0) {
            setCurrentTime(duration);
          }
        }}
        onError={(e) => {
          console.error('Audio playback/load error:', e);
          setIsLoading(false);
        }}
        preload="metadata"
      />

      {/* Progress bar and timeline */}
      <div className="flex items-center gap-3 w-full">
        <span 
          className="text-[11px] font-mono font-bold select-none w-10 text-right"
          style={{ color: '#8E9162' }}
        >
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 group flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeekChange}
            disabled={isLoading}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none disabled:opacity-50"
            style={{
              accentColor: '#8E9162',
              background: `linear-gradient(to right, #8E9162 0%, #8E9162 ${progressPercent}%, #cbd5e1 ${progressPercent}%, #cbd5e1 100%)`,
            }}
          />
        </div>

        <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 select-none w-10 text-left">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {/* Play/Pause Button - Solid #8E9162 with High-Contrast White Icon */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={!src}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all hover:scale-105 disabled:opacity-50 flex-shrink-0 cursor-pointer"
            style={{ backgroundColor: '#8E9162', color: '#ffffff' }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#ffffff' }} />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" style={{ fill: '#ffffff', color: '#ffffff' }} />
            ) : (
              <Play className="w-5 h-5 translate-x-[1px]" style={{ fill: '#ffffff', color: '#ffffff' }} />
            )}
          </button>

          {/* Reset/Restart */}
          <button
            type="button"
            onClick={restartAudio}
            title="Restart from beginning"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#8E9162] hover:border-[#8E9162]/40 transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Playback speed selector */}
          <button
            type="button"
            onClick={handlePlaybackRateChange}
            title="Speed"
            className="px-2.5 h-8 text-[11px] font-bold flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-[#8E9162]/40 transition-colors select-none font-mono flex-shrink-0 cursor-pointer shadow-2xs"
            style={{ color: '#8E9162' }}
          >
            {playbackRate.toFixed(2)}x
          </button>

          {/* Download Audio */}
          <a
            href={src}
            download="meeting-audio-recording.webm"
            target="_blank"
            rel="noopener noreferrer"
            title="Download Audio Recording"
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#8E9162] hover:border-[#8E9162]/40 transition-colors flex-shrink-0 text-[11px] font-bold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" style={{ color: '#8E9162' }} />
            <span className="hidden sm:inline">Download Audio</span>
          </a>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#8E9162] transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4" style={{ color: '#8E9162' }} />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 md:w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none"
            style={{
              accentColor: '#8E9162',
              background: `linear-gradient(to right, #8E9162 0%, #8E9162 ${(isMuted ? 0 : volume) * 100}%, #cbd5e1 ${(isMuted ? 0 : volume) * 100}%, #cbd5e1 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
