"use client";

/**
 * LUNARMATCH 2.0 — canvas starfield with parallax drift + occasional meteors
 */
import * as React from "react";

interface Star {
  x: number;
  y: number;
  z: number; // depth 0..1
  r: number;
  tw: number; // twinkle phase
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export function Starfield({ density = 0.00013, className }: { density?: number; className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const raf = React.useRef(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let meteors: Meteor[] = [];
    let t = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.floor(w * h * density);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        r: 0.3 + Math.random() * 1.1,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const spawnMeteor = () => {
      if (reduced) return;
      if (Math.random() < 0.004 && meteors.length < 2) {
        const fromLeft = Math.random() < 0.7;
        meteors.push({
          x: fromLeft ? -40 : Math.random() * w,
          y: Math.random() * h * 0.4,
          vx: 5 + Math.random() * 4,
          vy: 1.6 + Math.random() * 1.4,
          life: 1,
        });
      }
    };

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.6 + s.z) + s.tw));
        ctx.globalAlpha = tw * (0.25 + s.z * 0.6);
        ctx.fillStyle = s.z > 0.82 ? "#cfeeff" : s.z > 0.6 ? "#a8c8e8" : "#6e8aa8";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        // slow parallax drift
        if (!reduced) {
          s.x -= 0.006 + s.z * 0.016;
          if (s.x < -2) s.x = w + 2;
        }
      }
      spawnMeteor();
      meteors = meteors.filter((m) => m.life > 0);
      for (const m of meteors) {
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 9, m.y - m.vy * 9);
        grad.addColorStop(0, `rgba(160,240,255,${0.8 * m.life})`);
        grad.addColorStop(1, "rgba(160,240,255,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 9, m.y - m.vy * 9);
        ctx.stroke();
        m.x += m.vx;
        m.y += m.vy;
        m.life -= 0.012;
        if (m.x > w + 60 || m.y > h + 60) m.life = 0;
      }
      ctx.globalAlpha = 1;
      raf.current = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "fixed inset-0 z-0 pointer-events-none"}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
