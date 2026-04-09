'use client';

import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

/* ─────────────────────────────────────────────
   Dimensions
   iPhone 15 viewport: 390 × 844 px
   We scale it down to fit inside the phone frame.
───────────────────────────────────────────── */
const IPHONE_W = 390;
const IPHONE_H = 844;

const FRAME_W = 280;          // outer phone frame width
const FRAME_BORDER = 13;      // bevel (1.5×2) + body padding (5×2)
const SCREEN_W = FRAME_W - FRAME_BORDER;              // 267 px
const SCALE = SCREEN_W / IPHONE_W;                    // ≈ 0.685
const SCREEN_H = Math.round(IPHONE_H * SCALE);        // ≈ 578 px
const FRAME_H = SCREEN_H + FRAME_BORDER;              // ≈ 591 px

const R_OUTER = Math.round(FRAME_W * 0.118);          // 33 px
const R_INNER = R_OUTER - 5;                          // 28 px

const MAX_TILT = 10;

const AMBIENT_SHADOWS = [
  '0 1px 2px rgba(0,0,0,0.18)',
  '0 2px 4px rgba(0,0,0,0.14)',
  '0 4px 8px rgba(0,0,0,0.12)',
  '0 8px 16px 2px rgba(0,0,0,0.10)',
  '0 16px 32px 6px rgba(0,0,0,0.08)',
  '0 32px 64px 12px rgba(0,0,0,0.06)',
  '0 48px 96px 20px rgba(0,0,0,0.04)',
].join(', ');

export function PhoneDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]),
    { stiffness: 180, damping: 28 }
  );
  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]),
    { stiffness: 180, damping: 28 }
  );

  // Shine glint slides with tilt, oversized so borders never show
  const shineX = useTransform(rotateY, [-MAX_TILT, MAX_TILT], [FRAME_W * 0.04, -(FRAME_W * 0.04)]);
  const shineY = useTransform(rotateX, [-MAX_TILT, MAX_TILT], [-(FRAME_W * 0.04), FRAME_W * 0.04]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '900px' }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {/* ── Phone frame ── */}
        <div style={{ width: FRAME_W, height: FRAME_H, position: 'relative' }}>

          {/* Bevel — titanium-like outer ring */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: R_OUTER + 1,
            background: 'linear-gradient(145deg, #6a6a6a 0%, #2a2a2a 40%, #111 60%, #3a3a3a 100%)',
            padding: 1.5,
          }}>
            {/* Body */}
            <div style={{
              borderRadius: R_OUTER,
              background: '#1c1c1e',
              height: '100%',
              padding: 5,
              boxShadow: AMBIENT_SHADOWS,
            }}>
              {/* Screen clip */}
              <div style={{
                borderRadius: R_INNER,
                overflow: 'hidden',
                height: '100%',
                position: 'relative',
                background: '#fff',
              }}>

                {/* ── The real Menius app ── */}
                <div style={{
                  width: SCREEN_W,
                  height: SCREEN_H,
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                }}>
                  <iframe
                    src="/the-grill-house"
                    title="Menius — Live Demo"
                    style={{
                      width: IPHONE_W,
                      height: IPHONE_H,
                      transform: `scale(${SCALE})`,
                      transformOrigin: 'top left',
                      border: 'none',
                      display: 'block',
                    }}
                  />
                </div>

                {/* Dynamic Island — sits above iframe */}
                <div style={{
                  position: 'absolute',
                  top: 9,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: FRAME_W * 0.33,
                  height: FRAME_W * 0.088,
                  borderRadius: 999,
                  background: '#1c1c1e',
                  zIndex: 20,
                  pointerEvents: 'none',
                }} />

                {/* Inset shadow — recesses screen into frame */}
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: R_INNER,
                  boxShadow: 'inset 0 0 4px 1px rgba(0,0,0,0.35)',
                  pointerEvents: 'none',
                  zIndex: 30,
                }} />

                {/* Shine sharp — hard diagonal glint, oversized to allow slide */}
                <motion.div style={{
                  position: 'absolute',
                  top: -(FRAME_W * 0.25),
                  left: -(FRAME_W * 0.25),
                  right: -(FRAME_W * 0.25),
                  bottom: -(FRAME_W * 0.25),
                  background: 'linear-gradient(155deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.09) 35%, rgba(255,255,255,0) 35%)',
                  x: shineX,
                  y: shineY,
                  pointerEvents: 'none',
                  zIndex: 31,
                }} />

                {/* Shine soft — ambient glass wash */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 50%)',
                  pointerEvents: 'none',
                  zIndex: 32,
                }} />

              </div>
            </div>
          </div>

          {/* Side buttons */}
          <div style={{ position: 'absolute', left: -3, top: FRAME_H * 0.21, width: 3, height: FRAME_H * 0.06, background: 'linear-gradient(to right,#555,#3a3a3a)', borderRadius: '2px 0 0 2px' }} />
          <div style={{ position: 'absolute', left: -3, top: FRAME_H * 0.28, width: 3, height: FRAME_H * 0.06, background: 'linear-gradient(to right,#555,#3a3a3a)', borderRadius: '2px 0 0 2px' }} />
          <div style={{ position: 'absolute', right: -3, top: FRAME_H * 0.21, width: 3, height: FRAME_H * 0.085, background: 'linear-gradient(to left,#555,#3a3a3a)', borderRadius: '0 2px 2px 0' }} />

        </div>
      </motion.div>
    </div>
  );
}
