const PARALLAX_PX = 36;  // max uniform XY parallax for the whole stack
const DEPTH_Z = 18;      // per-layer Z separation in px
const LAYER_PARALLAX_FACTOR = 0.35; // fraction of base parallax applied per-layer (front more, back less)

import React, { useState, useEffect, useRef } from "react";
const images = [
  "/images/3d/_DSC2695_0000_Layer-0-copy-4.png",
  "/images/3d/_DSC2695_0001_Layer-0-copy-2.png",
  "/images/3d/_DSC2695_0002_Layer-0-copy.png",
  "/images/3d/_DSC2695_0003_Layer-0.png",
];

export default function ThreeDImages() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const targetTilt = useRef({ x: 0, y: 0 });
  useEffect(() => {
    let raf: number;
    const animate = () => {
      setTilt(prev => ({
        x: prev.x + (targetTilt.current.x - prev.x) * 0.12,
        y: prev.y + (targetTilt.current.y - prev.y) * 0.12,
      }));
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    const { innerWidth, innerHeight } = window;
    const x = ((e.clientY - innerHeight / 2) / innerHeight) * 20;
    const y = ((e.clientX - innerWidth / 2) / innerWidth) * 20;
    targetTilt.current = { x, y };
  };

  const handlePointerLeave = () => {
    targetTilt.current = { x: 0, y: 0 };
  };

  return (
    <div
      className="relative w-screen h-screen"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        perspective: "1400px",
        transformStyle: "preserve-3d",
        transform: (() => {
          const tx = tilt.y * (PARALLAX_PX / 10); // reuse tilt range (±10) → px
          const ty = tilt.x * (PARALLAX_PX / 10);
          return `translate3d(${tx}px, ${ty}px, 0) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`;
        })(),
        transition: "transform 220ms cubic-bezier(.2,.8,.2,1)",
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
              const baseTx = tilt.y * (PARALLAX_PX / 10);
              const baseTy = tilt.x * (PARALLAX_PX / 10);
              const depth01 = (images.length > 1) ? (i / (images.length - 1)) : 1; // 0 for front/top, 1 for back
              const extraTx = baseTx * depth01 * LAYER_PARALLAX_FACTOR;
              const extraTy = baseTy * depth01 * LAYER_PARALLAX_FACTOR;
              return `translate3d(${extraTx}px, ${extraTy}px, ${z}px)`;
            })(),
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            transition: "transform 220ms cubic-bezier(.2,.8,.2,1), filter 220ms ease, opacity 220ms ease",
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
    </div>
  );
}

