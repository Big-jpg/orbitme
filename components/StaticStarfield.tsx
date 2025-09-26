"use client";
import { useEffect, useRef } from "react";

/** Static CPU-drawn starfield that sits behind the WebGL canvas. */
export default function StaticStarfield({
  density = 0.00012, // stars per pixel (tweak to taste)
  maxSize = 3.2,     // px, scaled by devicePixelRatio
}: { density?: number; maxSize?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;

    const paint = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const count = Math.floor(w * h * density);
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * maxSize;
        const a = 0.5 + Math.random() * 0.5; // 0.5–1.0 alpha
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const onResize = () => requestAnimationFrame(paint);
    paint();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [density, maxSize]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
