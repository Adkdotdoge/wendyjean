// Slightly stronger effect
const PARALLAX_PX = 56;        // max uniform XY parallax for the whole stack (desktop)
const PARALLAX_PX_MOBILE = 32; // parallax on coarse/mobile
const DEPTH_Z = 24;            // per-layer Z separation in px
const LAYER_PARALLAX_FACTOR = 0.45; // fraction of base parallax applied per-layer (front more, back less)
const SPRING_STIFFNESS = 320;  // higher = snappier
const SPRING_DAMPING = 26;     // higher = more damping

import React, { useState, useEffect, useRef } from "react";
const images = [
  "/images/3d/_DSC2695_0000_Layer-0-copy-4.png",
  "/images/3d/_DSC2695_0001_Layer-0-copy-2.png",
  "/images/3d/_DSC2695_0002_Layer-0-copy.png",
  "/images/3d/_DSC2695_0003_Layer-0.png",
];

export default function ThreeDImages() {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const maxParallax = isCoarse ? PARALLAX_PX_MOBILE : PARALLAX_PX;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const lastTs = useRef<number | null>(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);

  // Spring smoothing (framerate‑independent)
  useEffect(() => {
    if (prefersReducedMotion) return;
    let raf: number;
    const step = (ts: number) => {
      const prevTs = lastTs.current ?? ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - prevTs) / 1000));
      lastTs.current = ts;

      // spring: a*x'' + b*x' + k(x - x*) = 0
      const k = SPRING_STIFFNESS;
      const b = SPRING_DAMPING;
      const ex = target.current.x - tilt.x;
      const ey = target.current.y - tilt.y;
      const ax = k * ex - b * vel.current.x;
      const ay = k * ey - b * vel.current.y;
      vel.current.x += ax * dt;
      vel.current.y += ay * dt;
      const nx = tilt.x + vel.current.x * dt;
      const ny = tilt.y + vel.current.y * dt;
      if (Math.abs(ex) < 0.001 && Math.abs(ey) < 0.001 && Math.abs(vel.current.x) < 0.001 && Math.abs(vel.current.y) < 0.001) {
        // snap to target to avoid sub‑pixel drift
        setTilt({ x: target.current.x, y: target.current.y });
      } else {
        setTilt({ x: nx, y: ny });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gyroEnabled) return; // ignore pointer when gyro is driving
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = (e.clientX - cx) / rect.width;  // -0.5..0.5 horizontally
    const ny = (e.clientY - cy) / rect.height; // -0.5..0.5 vertically
    // Map to degrees; invert so it tilts toward the pointer
    const tx = -ny * 20;
    const ty = nx * 20;
    target.current = { x: tx, y: ty };
  };

  const handlePointerLeave = () => {
    if (gyroEnabled) return;
    target.current = { x: 0, y: 0 };
  };

  // Gyroscope / device orientation support
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!gyroEnabled) return;
    let mounted = true;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const onOrient = (ev: DeviceOrientationEvent) => {
      if (!mounted) return;
      // beta: front/back tilt (-180..180), gamma: left/right tilt (-90..90)
      const beta = (ev.beta ?? 0);  // x‑axis
      const gamma = (ev.gamma ?? 0); // y‑axis
      // Map to our tilt range, clamp to ±20 deg for stability
      const tx = clamp(beta / 2, -20, 20);
      const ty = clamp(gamma / 2, -20, 20);
      target.current = { x: tx, y: ty };
    };

    window.addEventListener('deviceorientation', onOrient, true);
    return () => {
      mounted = false;
      window.removeEventListener('deviceorientation', onOrient, true);
    };
  }, [gyroEnabled, prefersReducedMotion]);

  const requestGyro = async () => {
    try {
      const AnyDO = (window as any).DeviceOrientationEvent;
      const AnyDM = (window as any).DeviceMotionEvent;
      if (AnyDO && typeof AnyDO.requestPermission === 'function') {
        const res = await AnyDO.requestPermission();
        if (res !== 'granted') return;
      }
      if (AnyDM && typeof AnyDM.requestPermission === 'function') {
        try { await AnyDM.requestPermission(); } catch {}
      }
      setGyroEnabled(true);
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100svh] md:h-screen"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchMove={(e) => {
        if (gyroEnabled) return;
        if (!containerRef.current) return;
        const t = e.touches && e.touches[0];
        if (!t) return;
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = (t.clientX - cx) / rect.width;
        const ny = (t.clientY - cy) / rect.height;
        const tx = -ny * 20;
        const ty = nx * 20;
        target.current = { x: tx, y: ty };
      }}
      onTouchEnd={() => { if (!gyroEnabled) target.current = { x: 0, y: 0 }; }}
      style={{
        perspective: "1400px",
        transformStyle: "preserve-3d",
        touchAction: 'none',
        transform: (() => {
          const tx = tilt.y * (maxParallax / 10); // reuse tilt range (±10) → px
          const ty = tilt.x * (maxParallax / 10);
          return `translate3d(${tx}px, ${ty}px, 0) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`;
        })(),
        // CSS transition provides a little extra smoothing when targets change abruptly
        transition: prefersReducedMotion ? undefined : "transform 160ms cubic-bezier(.2,.8,.2,1)",
        } as React.CSSProperties}
    >
      {images.slice().reverse().map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 w-full h-full max-w-[100vw] bg-center bg-cover"
          style={{
            backgroundImage: `url(${img})`,
            transform: (() => {
              const z = (i - (images.length - 1) / 2) * DEPTH_Z; // center Z around 0
              const baseTx = tilt.y * (maxParallax / 10);
              const baseTy = tilt.x * (maxParallax / 10);
              const depth01 = (images.length > 1) ? (i / (images.length - 1)) : 1; // 0 for front/top, 1 for back
              const extraTx = baseTx * depth01 * LAYER_PARALLAX_FACTOR;
              const extraTy = baseTy * depth01 * LAYER_PARALLAX_FACTOR;
              return `translate3d(${extraTx}px, ${extraTy}px, ${z}px)`;
            })(),
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: prefersReducedMotion ? undefined : "transform 160ms cubic-bezier(.2,.8,.2,1), filter 160ms ease, opacity 160ms ease",
            boxShadow: `0 10px 30px rgba(0,0,0,0.18)`,
            transformStyle: "preserve-3d",
            transformOrigin: "50% 50%",
            backfaceVisibility: "hidden",
            willChange: "transform",
            filter: 'saturate(1.02) contrast(1.02)',
          }}
        />
      ))}
      {/* Subtle vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.08) 100%)",
        }}
      />
      {/* Enable motion button for iOS permission (shows on coarse devices when not enabled) */}
      {(!gyroEnabled && !prefersReducedMotion) && (
        <button
          type="button"
          onClick={requestGyro}
          className="absolute bottom-4 left-4 rounded-md bg-black/70 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/80"
        >
          Enable Motion
        </button>
      )}
    </div>
  );
}
