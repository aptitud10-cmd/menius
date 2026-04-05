'use client';

/**
 * CartFlyParticles — isolated component for the "fly to cart" animation.
 * Manages its own state so quick-add events do NOT re-render MenuShell.
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  sx: number;
  sy: number;
}

interface CartFlyParticlesProps {
  cartColRef: React.RefObject<HTMLDivElement | null>;
}

export function CartFlyParticles({ cartColRef }: CartFlyParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y } = (e as CustomEvent).detail as { x: number; y: number };
      const id = ++idRef.current;
      setParticles((prev) => [...prev, { id, sx: x, sy: y }]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, 1100);
    };
    window.addEventListener('menu:cart-fly', handler);
    return () => window.removeEventListener('menu:cart-fly', handler);
  }, []);

  return (
    <>
      {particles.map((p) => {
        const cartRect = cartColRef.current?.getBoundingClientRect();
        const tx = cartRect ? cartRect.left + cartRect.width / 2 - p.sx : 0;
        const ty = cartRect ? cartRect.top + 60 - p.sy : -200;
        const arcX = tx * 0.4;
        const arcY = Math.min(ty * 0.3, -80);
        return (
          <motion.div
            key={p.id}
            className="fixed z-[999] pointer-events-none hidden lg:flex items-center justify-center"
            style={{ left: p.sx - 22, top: p.sy - 22, width: 44, height: 44 }}
            initial={{ scale: 0.8, opacity: 0, x: 0, y: 0 }}
            animate={{
              scale:   [0.8, 1.3, 1.2, 0.5],
              opacity: [0,   1,   1,   0],
              x:       [0,   arcX, arcX * 1.6, tx],
              y:       [0,   arcY, arcY * 0.5, ty],
            }}
            transition={{
              duration: 0.9,
              ease: 'easeInOut',
              times: [0, 0.18, 0.6, 1],
            }}
          >
            <div className="w-11 h-11 rounded-full bg-[#05c8a7] shadow-xl shadow-[#05c8a7]/50 flex items-center justify-center ring-2 ring-white/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
