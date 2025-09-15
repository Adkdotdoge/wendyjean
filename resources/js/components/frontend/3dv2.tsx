// This file contains the enhanced parallax/gyro version that evolved today.
// It is a copy of the current 3d.tsx prior to restoring the original.

// Slightly stronger effect
// Dial back global parallax slightly to reduce edge exposure
// Tone the overall effect down further to keep layers visually registered
// Reduce overall translate/perspective so composition sits closer to original
// Debug/QA: allow boosting motion via query (?boost3d=1..5) or localStorage('boost3d'='1'..'5')
const __getBoostLevel = (): number => {
  try {
    if (typeof window === 'undefined') return 0;
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get('boost3d');
    const ls = window.localStorage?.getItem('boost3d');
    const raw = (q && q.toLowerCase() === 'max') ? '5' : (q ?? ls ?? '0');
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, Math.min(5, Math.floor(n)));
    return raw === 'true' ? 1 : 0;
  } catch { return 0; }
};
const BOOST_LEVEL = __getBoostLevel();
const LERP = (a: number, b: number) => a + (b - a) * (BOOST_LEVEL / 5);

// Motion constants scale with BOOST_LEVEL (0..5)
const PARALLAX_PX = Math.round(LERP(24, 96));        // desktop max XY
const PARALLAX_PX_MOBILE = Math.round(LERP(16, 72)); // mobile max XY
const DEPTH_Z = Math.round(LERP(12, 28));            // per-layer Z separation
const LAYER_PARALLAX_FACTOR = LERP(0.24, 0.58);      // per-layer XY share
const SPRING_STIFFNESS = Math.round(LERP(300, 380)); // spring feel
const SPRING_DAMPING = Math.round(LERP(28, 22));     // lower damping when boosted
// For the front-most semantic slices (head-only, head+body+feet, head+body+feet+wings, bg accents),
// attenuate parallax much more strongly to prevent edge exposure around the beak area.
const FRONT_ATTEN_BASE = [0.12, 0.22, 0.38, 0.6];
const FRONT_ATTEN_MAX  = [0.20, 0.32, 0.50, 0.70];
const FRONT_ATTEN_TABLE = FRONT_ATTEN_BASE.map((v, i) => LERP(v, FRONT_ATTEN_MAX[i] ?? v));
// Reduce Z contribution on the very front slices so perspective rotation doesn't lift the head away
const FRONT_Z_BASE = [0.2, 0.5, 0.8, 1.0];
const FRONT_Z_MAX  = [0.5, 0.75, 0.92, 1.0];
const FRONT_Z_FACTOR = FRONT_Z_BASE.map((v, i) => LERP(v, FRONT_Z_MAX[i] ?? v));
// Absolute max pixel shift caps for the same slices (front → back) — keep tiny slices almost locked.
const FRONT_SHIFT_BASE = [4, 8, 10, 14];
const FRONT_SHIFT_MAX  = [12, 20, 28, 36];
const FRONT_MAX_SHIFT  = FRONT_SHIFT_BASE.map((v, i) => Math.round(LERP(v, FRONT_SHIFT_MAX[i] ?? v)));

import React, { useState, useEffect, useRef } from "react";
// 6‑layer stack (back → front)
const images = [
  "/images/3dv2/_DSC2695_0005_Layer-0.png",
  "/images/3dv2/_DSC2695_0004_Layer-0-copy.png",
  "/images/3dv2/_DSC2695_0003_Layer-0-copy-2.png",
  "/images/3dv2/_DSC2695_0002_Layer-0-copy-4.png",
  "/images/3dv2/_DSC2695_0001_Layer-0-copy-5.png",
  "/images/3dv2/_DSC2695_0000_Layer-0-copy-6.png",
];

export default function ThreeDImagesV2() {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const maxParallax = isCoarse ? PARALLAX_PX_MOBILE : PARALLAX_PX;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const lastTs = useRef<number | null>(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const gyroTsRef = useRef<number | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    const list = images.slice();
    list.forEach((src) => { const im = new Image(); im.src = src; });
    const probe = new Image();
    probe.onload = () => { if (probe.naturalHeight > 0) setRatio(probe.naturalWidth / probe.naturalHeight); };
    probe.src = images[images.length - 1];
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    let raf: number;
    const step = (ts: number) => {
      const prevTs = lastTs.current ?? ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - prevTs) / 1000));
      lastTs.current = ts;
      const k = SPRING_STIFFNESS; const b = SPRING_DAMPING;
      const ex = target.current.x - tilt.x; const ey = target.current.y - tilt.y;
      const ax = k * ex - b * vel.current.x; const ay = k * ey - b * vel.current.y;
      vel.current.x += ax * dt; vel.current.y += ay * dt;
      const nx = tilt.x + vel.current.x * dt; const ny = tilt.y + vel.current.y * dt;
      if (Math.abs(ex) < 0.001 && Math.abs(ey) < 0.001 && Math.abs(vel.current.x) < 0.001 && Math.abs(vel.current.y) < 0.001) setTilt({ x: target.current.x, y: target.current.y });
      else setTilt({ x: nx, y: ny });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gyroEnabled && gyroTsRef.current && (performance.now() - gyroTsRef.current) < 400) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2;
    const nx = (e.clientX - cx) / rect.width; const ny = (e.clientY - cy) / rect.height;
    const tx = -ny * Math.round(10 + (18 * (BOOST_LEVEL / 5))); // tilt 10→28
    const ty = nx * Math.round(10 + (18 * (BOOST_LEVEL / 5)));
    target.current = { x: tx, y: ty };
    if (prefersReducedMotion) setTilt({ x: tx, y: ty });
  };
  const handlePointerLeave = () => { if (!gyroEnabled) { target.current = { x: 0, y: 0 }; if (prefersReducedMotion) setTilt({ x: 0, y: 0 }); } };

  useEffect(() => {
    if (prefersReducedMotion || !gyroEnabled) return;
    let mounted = true;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const onOrient = (ev: DeviceOrientationEvent) => {
      if (!mounted) return;
      const beta = (ev.beta ?? 0); const gamma = (ev.gamma ?? 0);
      const maxTilt = Math.round(10 + (18 * (BOOST_LEVEL / 5)));
      const tx = clamp(beta / 3, -maxTilt, maxTilt);
      const ty = clamp(gamma / 3, -maxTilt, maxTilt);
      target.current = { x: tx, y: ty }; gyroTsRef.current = performance.now();
      if (prefersReducedMotion) setTilt({ x: tx, y: ty });
    };
    window.addEventListener('deviceorientation', onOrient, true);
    return () => { mounted = false; window.removeEventListener('deviceorientation', onOrient, true); };
  }, [gyroEnabled, prefersReducedMotion]);

  const requestGyro = async () => {
    try {
      const AnyDO = (window as any).DeviceOrientationEvent; const AnyDM = (window as any).DeviceMotionEvent;
      if (AnyDO && typeof AnyDO.requestPermission === 'function') { const res = await AnyDO.requestPermission(); if (res !== 'granted') return; }
      if (AnyDM && typeof AnyDM.requestPermission === 'function') { try { await AnyDM.requestPermission(); } catch {} }
      setGyroEnabled(true);
    } catch {}
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden"
      onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}
      onMouseMove={handlePointerMove as any} onMouseLeave={handlePointerLeave as any}
      onTouchMove={(e) => { if (gyroEnabled || !containerRef.current) return; const t = e.touches && e.touches[0]; if (!t) return; const rect = containerRef.current.getBoundingClientRect(); const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2; const nx = (t.clientX - cx) / rect.width; const ny = (t.clientY - cy) / rect.height; const maxTilt = Math.round(10 + (18 * (BOOST_LEVEL / 5))); const tx = -ny * maxTilt; const ty = nx * maxTilt; target.current = { x: tx, y: ty }; }}
      onTouchEnd={() => { if (!gyroEnabled) target.current = { x: 0, y: 0 }; }}
      style={{ perspective: "1400px", transformStyle: "preserve-3d", touchAction: 'none', aspectRatio: ratio ? `${ratio} / 1` : '16 / 9', transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` } as React.CSSProperties}
    >
      {BOOST_LEVEL > 0 && (<div className="absolute right-2 top-2 z-[100] rounded bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">3D Boost {BOOST_LEVEL}</div>)}
      {images.map((img, i) => (
        <div key={i} className="absolute inset-0 w-full h-full max-w-[100vw] bg-center bg-cover pointer-events-none" style={{
          backgroundImage: `url(${img})`,
          transform: (() => {
            const layerCount = images.length;
            let z = (i - (layerCount - 1) / 2) * DEPTH_Z;
            const baseTx = tilt.y * (maxParallax / 10); const baseTy = tilt.x * (maxParallax / 10);
            const depth01 = (layerCount > 1) ? (i / (layerCount - 1)) : 1;
            const idxFromFront = (layerCount - 1) - i;
            const frontAtten = FRONT_ATTEN_TABLE[idxFromFront] ?? 1;
            const zFactor = FRONT_Z_FACTOR[idxFromFront] ?? 1; z *= zFactor;
            let extraTx = baseTx * depth01 * LAYER_PARALLAX_FACTOR * frontAtten;
            let extraTy = baseTy * depth01 * LAYER_PARALLAX_FACTOR * frontAtten;
            const maxShift = FRONT_MAX_SHIFT[idxFromFront] ?? Number.POSITIVE_INFINITY;
            if (Number.isFinite(maxShift)) { const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v)); extraTx = clamp(extraTx, maxShift); extraTy = clamp(extraTy, maxShift); }
            return `translate3d(${extraTx}px, ${extraTy}px, ${z}px)`;
          })(),
          backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', zIndex: i,
          transformStyle: "preserve-3d", transformOrigin: "50% 50%", backfaceVisibility: "hidden", willChange: "transform",
        }} />
      ))}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.08) 100%)" }} />
      {(isCoarse && !gyroEnabled && !prefersReducedMotion) && (
        <button type="button" onClick={requestGyro} className="absolute bottom-4 left-4 rounded-md bg-black/70 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-black/80">Enable Motion</button>
      )}
    </div>
  );
}

