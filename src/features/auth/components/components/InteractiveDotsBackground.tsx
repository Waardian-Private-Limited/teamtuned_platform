'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
}

export function InteractiveDotsBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: null as number | null,
      y: null as number | null,
      radius: 170, // Connection distance to pointer
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Particle density calculation
    let particles: Particle[] = [];
    const initParticles = () => {
      particles = [];
      // Approximately 1 dot per 18,000 px^2, between 50 and 110 dots
      const count = Math.max(50, Math.min(110, Math.floor((width * height) / 18000)));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          radius: Math.random() * 1.5 + 1.2,
          baseAlpha: Math.random() * 0.35 + 0.25,
        });
      }
    };

    initParticles();

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const maxConnectDist = 110;
      const maxConnectDistSq = maxConnectDist * maxConnectDist;
      const maxMouseDistSq = mouse.radius * mouse.radius;

      // 1. Draw connections between dots that are close to each other
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxConnectDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxConnectDist) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 102, 255, ${alpha})`; // Logo blue #0066ff
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 2. Connect dots to mouse pointer with vivid logo blue lines
      if (mouse.x !== null && mouse.y !== null) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxMouseDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / mouse.radius) * 0.65;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(0, 102, 255, ${alpha})`; // TeamTuned brand blue #0066ff
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      // 3. Update & Draw individual dots
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Wrap or bounce off edges
        if (p.x < 0) p.x = width;
        else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        else if (p.y > height) p.y = 0;

        // Check if particle is near mouse to give it a brighter glow
        let isNearMouse = false;
        if (mouse.x !== null && mouse.y !== null) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          if (dx * dx + dy * dy < maxMouseDistSq) {
            isNearMouse = true;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, isNearMouse ? p.radius * 1.3 : p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isNearMouse
          ? 'rgba(0, 102, 255, 0.9)' // Glowing logo blue when near cursor
          : `rgba(180, 205, 255, ${p.baseAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
