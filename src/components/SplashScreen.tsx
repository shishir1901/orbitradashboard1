/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playAvionicBeep } from '../utils/audio';

export const DEFAULT_BG_SRC = '/assets/milkyway.gif';
const FALLBACK_BG_SRC = '/assets/milkyway.jpg';

interface SplashScreenProps {
  onEnter: () => void;
  bgSrc?: string;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alphaSpeed: number;
  phase: number;
  color: string;
}

export function SplashScreen({ onEnter, bgSrc = DEFAULT_BG_SRC }: SplashScreenProps) {
  const [activeBg, setActiveBg] = useState<string>(bgSrc);
  const [isBgLoaded, setIsBgLoaded] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Initializing avionics telemetry...');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasExitedRef = useRef<boolean>(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Preload background asset with automatic graceful fallback
  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.src = activeBg;

    img.onload = () => {
      if (isMounted) setIsBgLoaded(true);
    };

    img.onerror = () => {
      if (!isMounted) return;
      if (activeBg !== FALLBACK_BG_SRC) {
        // Fallback to jpg if gif fails
        setActiveBg(FALLBACK_BG_SRC);
      } else {
        setIsBgLoaded(true); // Proceed with procedural dark fallback
      }
    };

    return () => {
      isMounted = false;
    };
  }, [activeBg]);

  // Handle smooth exit transition
  const handleExit = useCallback(() => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;
    setIsExiting(true);

    try {
      playAvionicBeep(1760, 0.08);
      setTimeout(() => {
        playAvionicBeep(2640, 0.1);
      }, 90);
    } catch (_) {
      // Audio autoplay may be restricted prior to user gesture
    }

    try {
      sessionStorage.setItem('orbitra_splash_seen', 'true');
    } catch (_) {
      // Ignore private browsing storage restrictions
    }

    setTimeout(() => {
      onEnter();
    }, 500);
  }, [onEnter]);

  // Keypress listener for Enter / Space / Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExit]);

  // Progress bar filling over ~3.5 seconds with staged telemetry status
  useEffect(() => {
    const totalDuration = 3500;
    const intervalTime = 40;
    const increment = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + increment);

        if (next < 22) {
          setStatusText('Initializing avionics telemetry systems...');
        } else if (next < 48) {
          setStatusText('Establishing GNSS & NavIC constellation link...');
        } else if (next < 74) {
          setStatusText('Calibrating 6-DOF inertial attitude matrix...');
        } else if (next < 95) {
          setStatusText('Synchronizing Ground Station ESP32 radio gateway...');
        } else {
          setStatusText('Mission Control GS-01 nominal • Ready for flight');
        }

        if (next >= 100) {
          clearInterval(timer);
          // Brief pause after reaching 100% before auto-continuing
          setTimeout(() => {
            handleExit();
          }, 350);
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [handleExit]);

  // Canvas starfield particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate ~100 stars with varied depths and colors
    const starColors = ['#FFFFFF', '#22D3EE', '#2de3a5', '#A78BFA', '#7DF4FF'];
    const stars: Star[] = Array.from({ length: 110 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.6 + 0.5,
      baseAlpha: Math.random() * 0.5 + 0.25,
      alphaSpeed: (Math.random() * 0.02 + 0.008) * (Math.random() > 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    let time = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.03;

      stars.forEach((star) => {
        let alpha = star.baseAlpha;
        if (!prefersReducedMotion) {
          alpha = star.baseAlpha + Math.sin(time * 1.5 + star.phase) * 0.28;
          alpha = Math.max(0.1, Math.min(0.95, alpha));
        }

        ctx.save();
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Extra twinkle glow on larger stars
        if (star.radius > 1.4 && !prefersReducedMotion) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = star.color;
          ctx.stroke();
        }
        ctx.restore();
      });

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="COSMIC ERA Mission Control Intro Splash"
      className={`fixed inset-0 z-[9999] bg-[#0A1020] text-white select-none overflow-hidden flex flex-col justify-between transition-opacity duration-500 ease-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. Background Media Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Dark Fallback Base Canvas */}
        <div className="absolute inset-0 bg-[#0A1020] tech-grid opacity-75" />

        {/* Looping Milky Way Media with optional slow zoom */}
        <div
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
            isBgLoaded ? 'opacity-90' : 'opacity-0'
          } ${prefersReducedMotion ? '' : 'animate-milkyway-zoom'}`}
        >
          <img
            src={activeBg}
            alt="Milky Way Galaxy View"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* 2. Dark Vignette & Gradient Overlays for optimal readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(10, 16, 32, 0.42) 0%, rgba(10, 16, 32, 0.78) 60%, rgba(10, 16, 32, 0.96) 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1020]/80 via-transparent to-[#0A1020]/95" />

        {/* 3. Twinkling Star Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* 4. Aerospace HUD Corner Reticles */}
        <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#2de3a5]/50 pointer-events-none" />
        <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#2de3a5]/50 pointer-events-none" />
        <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#2de3a5]/50 pointer-events-none" />
        <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#2de3a5]/50 pointer-events-none" />
      </div>

      {/* Top Mission Telemetry Bar */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-6 flex items-center justify-between text-xs font-mono text-[#8B9BB4]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2de3a5] animate-ping" />
          <span className="text-[#2de3a5] font-bold tracking-wider">SYSTEMS ARMED</span>
          <span className="hidden sm:inline text-[#1E2A3F]">|</span>
          <span className="hidden sm:inline">CALLSIGN: VU2MMM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline">26.7314° N, 83.4331° E</span>
          <button
            onClick={handleExit}
            className="px-2.5 py-1 rounded bg-[#111A2B]/80 hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white transition-colors text-[11px] flex items-center gap-1 active:scale-95"
            title="Skip Intro (Esc, Enter, Space)"
          >
            <span>SKIP INTRO</span>
            <span className="material-symbols-outlined text-[14px]">fast_forward</span>
          </button>
        </div>
      </div>

      {/* Center Hero Block: COSMIC ERA & ORBITRA */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto my-auto py-8">
        {/* Subtle Avionics Pill Badge */}
        <div className="mb-4 inline-flex items-center gap-2 bg-[#111A2B]/80 border border-[#2de3a5]/30 rounded-full px-3.5 py-1 backdrop-blur-md shadow-[0_0_15px_rgba(45,227,165,0.15)]">
          <span className="material-symbols-outlined text-[#2de3a5] text-[16px]">satellite_alt</span>
          <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-widest text-[#2de3a5] uppercase">
            AEROSPACE MISSION CONTROL TERMINAL
          </span>
        </div>

        {/* Main Team Name: COSMIC ERA */}
        <h1
          className={`font-mono text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[0.25em] sm:tracking-[0.32em] text-[#2de3a5] mb-3 select-none ${
            prefersReducedMotion ? '' : 'animate-neon-pulse'
          }`}
          style={{
            textShadow:
              '0 0 14px rgba(45, 227, 165, 0.85), 0 0 35px rgba(45, 227, 165, 0.5), 0 0 60px rgba(34, 211, 238, 0.4)',
          }}
        >
          COSMIC ERA
        </h1>

        {/* Glowing Divider Line with Center Reticle */}
        <div className="flex items-center gap-3 my-2 w-full max-w-xs sm:max-w-md justify-center">
          <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#2de3a5] to-[#2de3a5]" />
          <div className="w-2 h-2 rotate-45 bg-[#2de3a5] shadow-[0_0_8px_#2de3a5]" />
          <div className="flex-1 h-[1.5px] bg-gradient-to-l from-transparent via-[#2de3a5] to-[#2de3a5]" />
        </div>

        {/* Competition Name: ORBITRA */}
        <h2 className="font-mono text-xl sm:text-2xl md:text-3xl font-extrabold tracking-[0.3em] text-white uppercase mt-2 drop-shadow-md">
          ORBITRA
        </h2>

        {/* Tagline */}
        <p className="font-mono text-xs sm:text-sm text-[#8B9BB4] tracking-widest uppercase mt-3 max-w-lg">
          Ground Station GS-01 · CanSat Mission Control
        </p>

        {/* Institutional Credit */}
        <span className="font-mono text-[10px] text-[#8B9BB4]/70 tracking-wider uppercase mt-1">
          MMMUT Gorakhpur Space Research Wing
        </span>
      </div>

      {/* Bottom Section: Progress Bar, Status & ENTER Button */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-6 pb-10 flex flex-col items-center gap-4">
        {/* Status Text & Progress Percent */}
        <div className="w-full flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-[#8B9BB4] truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-pulse shrink-0" />
            <span className="truncate">{statusText}</span>
          </div>
          <span className="text-[#2de3a5] font-bold shrink-0 pl-3">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Thin Progress Bar */}
        <div className="w-full h-1.5 bg-[#111A2B] border border-[#1E2A3F] rounded-full overflow-hidden p-[1px] shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] via-[#2de3a5] to-[#34D399] transition-all duration-100 ease-out shadow-[0_0_12px_rgba(45,227,165,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Glowing ENTER MISSION CONTROL Button */}
        <button
          onClick={handleExit}
          className="mt-2 w-full sm:w-auto px-8 py-3 rounded-full font-mono text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#0A1020] bg-[#22D3EE] hover:bg-[#06B6D4] shadow-[0_0_20px_rgba(34,211,238,0.55)] hover:shadow-[0_0_30px_rgba(45,227,165,0.75)] active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-[#22D3EE]/50 group"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">
            rocket_launch
          </span>
          <span>ENTER MISSION CONTROL</span>
        </button>

        {/* Quick Skip Keyboard Hints */}
        <span className="text-[10px] font-mono text-[#8B9BB4]/75 tracking-wider">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[#111A2B] border border-[#1E2A3F] text-white">Enter</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-[#111A2B] border border-[#1E2A3F] text-white">Space</kbd> to enter immediately
        </span>
      </div>
    </div>
  );
}
