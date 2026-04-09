'use client';

import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import type { LandingLocale } from '@/lib/landing-translations';

const WIDTH = 280;
const HEIGHT = Math.round(WIDTH * 2.175); // iPhone 17 Pro aspect ratio
const OUTER_RADIUS = WIDTH * 0.12;
const INNER_RADIUS = OUTER_RADIUS - 5;
const MAX_TILT = 12;
const EDGE_DEPTH = 8;
const SHINE_MAX_OFFSET = WIDTH * 0.05;

const AMBIENT_SHADOWS = [
  '0 1px 2px rgba(0,0,0,0.15)',
  '0 2px 4px rgba(0,0,0,0.12)',
  '0 4px 8px rgba(0,0,0,0.10)',
  '0 6px 12px 2px rgba(0,0,0,0.08)',
  '0 8px 16px 4px rgba(0,0,0,0.06)',
  '0 12px 24px 6px rgba(0,0,0,0.05)',
  '0 16px 32px 10px rgba(0,0,0,0.04)',
  '0 24px 48px 16px rgba(0,0,0,0.03)',
  '0 32px 64px 24px rgba(0,0,0,0.03)',
];

type Tilt = { x: number; y: number };

function DynamicIsland({ tilt }: { tilt: Tilt }) {
  const notchW = WIDTH * 0.33;
  const notchH = WIDTH * 0.09;
  const specTop = 20 - (tilt.y / MAX_TILT) * 10;
  const specLeft = 25 - (tilt.x / MAX_TILT) * 10;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: notchW,
        height: notchH,
        borderRadius: 999,
        background: '#181818',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: notchH * 0.15,
      }}
    >
      <div
        style={{
          width: notchH * 0.7,
          height: notchH * 0.7,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #1a1a1a 0%, #050505 100%)',
          boxShadow: 'inset 0 0 1px 0.5px rgba(255,255,255,0.08)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 2,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 40% 40%, #222 0%, #0a0a0a 60%, #050505 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: `${specTop}%`,
              left: `${specLeft}%`,
              width: '25%',
              height: '25%',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.35)',
              filter: 'blur(1px)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MenuScreen({ locale }: { locale: LandingLocale }) {
  const isEs = locale === 'es';
  const items = isEs
    ? [
        { name: 'Tacos al Pastor', price: '$89', emoji: '🌮', popular: true },
        { name: 'Guac + Totopos', price: '$65', emoji: '🥑', popular: false },
        { name: 'Agua Fresca', price: '$35', emoji: '🍹', popular: false },
      ]
    : [
        { name: 'BBQ Burger', price: '$12', emoji: '🍔', popular: true },
        { name: 'Loaded Fries', price: '$8', emoji: '🍟', popular: false },
        { name: 'Lemonade', price: '$5', emoji: '🍋', popular: false },
      ];

  const categories = isEs
    ? ['Popular', 'Tacos', 'Bebidas', 'Postres']
    : ['Popular', 'Burgers', 'Sides', 'Drinks'];

  const restaurantName = isEs ? 'Casa de Tacos' : 'The Burger Joint';

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: '#FAFAF8', color: '#1a1a1a' }}
    >
      {/* Status bar */}
      <div
        className="flex items-center justify-between px-5 pt-3 pb-1 flex-shrink-0"
        style={{ fontSize: 10, color: '#666' }}
      >
        <span style={{ fontWeight: 600 }}>9:41</span>
        <div className="flex items-center gap-1">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <rect x="0" y="5" width="2" height="3" rx="0.5" fill="#1a1a1a" />
            <rect x="3" y="3" width="2" height="5" rx="0.5" fill="#1a1a1a" />
            <rect x="6" y="1" width="2" height="7" rx="0.5" fill="#1a1a1a" />
            <rect x="9" y="0" width="2" height="8" rx="0.5" fill="#1a1a1a" />
          </svg>
          <svg width="15" height="8" viewBox="0 0 15 8" fill="none">
            <rect x="0.5" y="0.5" width="12" height="7" rx="1.5" stroke="#1a1a1a" strokeOpacity="0.4" />
            <rect x="13" y="2.5" width="1.5" height="3" rx="0.75" fill="#1a1a1a" fillOpacity="0.4" />
            <rect x="1.5" y="1.5" width="9" height="5" rx="0.75" fill="#1a1a1a" />
          </svg>
        </div>
      </div>

      {/* Restaurant header */}
      <div className="px-4 pt-8 pb-2 text-center flex-shrink-0">
        <div
          className="w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #ff6b35 0%, #e8431a 100%)',
            boxShadow: '0 4px 12px rgba(232,67,26,0.35)',
          }}
        >
          <span style={{ fontSize: 16 }}>🍽️</span>
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a' }}>{restaurantName}</p>
        <p style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
          {isEs ? '⭐ 4.9 · Mesa 4' : '⭐ 4.9 · Table 4'}
        </p>
      </div>

      {/* Categories */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-hidden flex-shrink-0">
        {categories.map((cat, i) => (
          <span
            key={cat}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 600,
              flexShrink: 0,
              background: i === 0 ? '#ff6b35' : 'rgba(0,0,0,0.06)',
              color: i === 0 ? '#fff' : '#666',
            }}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Items */}
      <div className="px-4 flex flex-col gap-2 flex-1 overflow-hidden">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2.5"
            style={{
              padding: '7px 8px',
              borderRadius: 12,
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255,107,53,0.08)',
                fontSize: 18,
              }}
            >
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p style={{ fontSize: 10, fontWeight: 600, color: '#1a1a1a' }}>{item.name}</p>
                {item.popular && (
                  <span
                    style={{
                      padding: '1px 4px',
                      borderRadius: 4,
                      background: 'rgba(255,107,53,0.12)',
                      color: '#ff6b35',
                      fontSize: 7,
                      fontWeight: 700,
                    }}
                  >
                    {isEs ? 'POPULAR' : 'HOT'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 8, color: '#999', marginTop: 1 }}>
                {isEs ? 'Hecho al momento' : 'Made fresh'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p style={{ fontSize: 10, fontWeight: 700, color: '#1a1a1a' }}>{item.price}</p>
              <div
                style={{
                  marginTop: 3,
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: '#ff6b35',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 'auto',
                  boxShadow: '0 2px 6px rgba(255,107,53,0.4)',
                }}
              >
                <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>+</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart CTA */}
      <div className="px-4 pb-5 pt-2 flex-shrink-0">
        <div
          style={{
            padding: '9px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #ff6b35 0%, #e8431a 100%)',
            boxShadow: '0 4px 14px rgba(232,67,26,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>
            🛒 {isEs ? 'Ver pedido' : 'View order'}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>$89</span>
        </div>
      </div>

      {/* Home indicator */}
      <div className="flex justify-center pb-2 flex-shrink-0">
        <div style={{ width: 80, height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.12)' }} />
      </div>
    </div>
  );
}

interface PhoneFrameProps {
  shineX: MotionValue<number>;
  shineY: MotionValue<number>;
  shineOpacity: MotionValue<number>;
  locale: LandingLocale;
}

function PhoneFrame({ shineX, shineY, shineOpacity, locale }: PhoneFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: WIDTH,
        height: HEIGHT,
      }}
    >
      {/* Bevel — metallic outer ring */}
      <div
        style={{
          padding: 1,
          borderRadius: OUTER_RADIUS + 1,
          background: 'linear-gradient(135deg, #555 0%, #000 100%)',
          height: '100%',
        }}
      >
        {/* Body */}
        <div
          style={{
            padding: 5,
            borderRadius: OUTER_RADIUS,
            background: '#181818',
            height: '100%',
            boxShadow: AMBIENT_SHADOWS.join(', '),
          }}
        >
          {/* Screen area */}
          <div
            style={{
              borderRadius: INNER_RADIUS,
              overflow: 'hidden',
              height: '100%',
              position: 'relative',
              lineHeight: 0,
            }}
          >
            <DynamicIsland tilt={{ x: 0, y: 0 }} />
            <MenuScreen locale={locale} />

            {/* Inset shadow (recesses screen into frame) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: INNER_RADIUS,
                boxShadow: 'inset 0 0 3px 1px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />

            {/* Shine sharp (hard diagonal glint — oversized for room to slide) */}
            <motion.div
              style={{
                position: 'absolute',
                top: -(WIDTH * 0.25),
                left: -(WIDTH * 0.25),
                right: -(WIDTH * 0.25),
                bottom: -(WIDTH * 0.25),
                background:
                  'linear-gradient(155deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.10) 35%, rgba(255,255,255,0) 35%)',
                x: shineX,
                y: shineY,
                opacity: shineOpacity,
                pointerEvents: 'none',
                zIndex: 25,
              }}
            />

            {/* Shine soft (ambient glass wash) */}
            <div
              style={{
                position: 'absolute',
                inset: 3,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 55%)',
                pointerEvents: 'none',
                zIndex: 22,
              }}
            />
          </div>
        </div>
      </div>

      {/* Side buttons — left (volume up) */}
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: HEIGHT * 0.215,
          width: 3,
          height: HEIGHT * 0.06,
          background: 'linear-gradient(to right, #444, #333)',
          borderRadius: '2px 0 0 2px',
          opacity: 0.7,
        }}
      />
      {/* Side buttons — left (volume down) */}
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: HEIGHT * 0.29,
          width: 3,
          height: HEIGHT * 0.06,
          background: 'linear-gradient(to right, #444, #333)',
          borderRadius: '2px 0 0 2px',
          opacity: 0.7,
        }}
      />
      {/* Side buttons — right (power) */}
      <div
        style={{
          position: 'absolute',
          right: -3,
          top: HEIGHT * 0.22,
          width: 3,
          height: HEIGHT * 0.08,
          background: 'linear-gradient(to left, #444, #333)',
          borderRadius: '0 2px 2px 0',
          opacity: 0.7,
        }}
      />
    </div>
  );
}

export function PhoneMockup({ locale }: { locale: LandingLocale }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateYMV = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]),
    { stiffness: 200, damping: 30 }
  );
  const rotateXMV = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]),
    { stiffness: 200, damping: 30 }
  );

  const shineX = useTransform(rotateYMV, [-MAX_TILT, MAX_TILT], [SHINE_MAX_OFFSET, -SHINE_MAX_OFFSET]);
  const shineY = useTransform(rotateXMV, [-MAX_TILT, MAX_TILT], [-SHINE_MAX_OFFSET, SHINE_MAX_OFFSET]);
  const shineOpacity = useTransform(rotateYMV, [-MAX_TILT, 0, MAX_TILT], [0.3, 0.6, 1]);

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
      style={{ perspective: '800px', cursor: 'default' }}
    >
      <motion.div
        style={{
          rotateX: rotateXMV,
          rotateY: rotateYMV,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        <PhoneFrame
          shineX={shineX}
          shineY={shineY}
          shineOpacity={shineOpacity}
          locale={locale}
        />
      </motion.div>
    </div>
  );
}
