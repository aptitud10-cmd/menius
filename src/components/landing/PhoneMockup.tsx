'use client';

import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { LandingLocale } from '@/lib/landing-translations';

const WIDTH = 290;
const HEIGHT = Math.round(WIDTH * 2.165);
const OUTER_RADIUS = WIDTH * 0.115;
const INNER_RADIUS = OUTER_RADIUS - 4;
const MAX_TILT = 10;

const AMBIENT_SHADOWS = [
  '0 2px 4px rgba(0,0,0,0.3)',
  '0 4px 8px rgba(0,0,0,0.25)',
  '0 8px 16px rgba(0,0,0,0.2)',
  '0 16px 32px rgba(0,0,0,0.15)',
  '0 32px 64px rgba(0,0,0,0.1)',
  '0 0 80px 4px rgba(13,148,136,0.08)',
];

function DynamicIsland() {
  const notchW = WIDTH * 0.32;
  const notchH = WIDTH * 0.085;
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        width: notchW,
        height: notchH,
        borderRadius: 999,
        background: '#000',
        zIndex: 10,
      }}
    />
  );
}

function MenuScreen({ locale }: { locale: LandingLocale }) {
  const isEs = locale === 'es';

  const items = [
    {
      name: 'Tacos al Pastor',
      price: '$12.99',
      popular: true,
      bg: 'linear-gradient(135deg, #3d1a00 0%, #1a0800 100%)',
      emoji: '🌮',
    },
    {
      name: 'Guacamole',
      price: '$8.50',
      popular: false,
      bg: 'linear-gradient(135deg, #0d3318 0%, #061a0c 100%)',
      emoji: '🥑',
    },
    {
      name: 'Enchiladas',
      price: '$14.99',
      popular: false,
      bg: 'linear-gradient(135deg, #3d0d0d 0%, #1a0606 100%)',
      emoji: '🫔',
    },
    {
      name: 'Horchata',
      price: '$4.00',
      popular: false,
      bg: 'linear-gradient(135deg, #0d1a3d 0%, #060c1a 100%)',
      emoji: '🥛',
    },
  ];

  const categories = isEs
    ? ['Popular', 'Tacos', 'Bebidas', 'Postres']
    : ['Popular', 'Tacos', 'Drinks', 'Desserts'];

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px 4px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <rect x="0" y="6" width="2.5" height="4" rx="0.6" fill="rgba(255,255,255,0.9)" />
            <rect x="3.5" y="4" width="2.5" height="6" rx="0.6" fill="rgba(255,255,255,0.9)" />
            <rect x="7" y="2" width="2.5" height="8" rx="0.6" fill="rgba(255,255,255,0.9)" />
            <rect x="10.5" y="0" width="2.5" height="10" rx="0.6" fill="rgba(255,255,255,0.9)" />
          </svg>
          <svg width="18" height="9" viewBox="0 0 18 9" fill="none">
            <rect x="0.5" y="0.5" width="14" height="8" rx="2" stroke="rgba(255,255,255,0.4)" />
            <rect x="15" y="2.5" width="2" height="4" rx="1" fill="rgba(255,255,255,0.4)" />
            <rect x="1.5" y="1.5" width="11" height="6" rx="1.2" fill="#0d9488" />
          </svg>
        </div>
      </div>

      {/* Restaurant header */}
      <div style={{ padding: '10px 16px 8px', textAlign: 'center', flexShrink: 0 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            background: '#0d9488',
            margin: '0 auto 7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(13,148,136,0.4)',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>M</span>
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', margin: 0 }}>
          La Taquería
        </p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0' }}>
          {isEs ? 'Mesa 5 · Menú digital' : 'Table 5 · Digital menu'}
        </p>
      </div>

      {/* Category pills */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '0 16px 10px',
          overflowX: 'hidden',
          flexShrink: 0,
        }}
      >
        {categories.map((cat, i) => (
          <span
            key={cat}
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 700,
              flexShrink: 0,
              background: i === 0 ? '#fff' : 'rgba(255,255,255,0.08)',
              color: i === 0 ? '#0a0a0a' : 'rgba(255,255,255,0.5)',
              border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Products 2×2 grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          padding: '0 16px',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {items.map((item) => (
          <div
            key={item.name}
            style={{
              borderRadius: 14,
              background: '#161616',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div
              style={{
                background: item.bg,
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 70,
              }}
            >
              <span style={{ fontSize: 28, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>
                {item.emoji}
              </span>
              {item.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    background: '#f59e0b',
                    borderRadius: 5,
                    padding: '2px 5px',
                    fontSize: 7,
                    fontWeight: 800,
                    color: '#fff',
                  }}
                >
                  ★
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: 7,
                  right: 7,
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(13,148,136,0.5)',
                }}
              >
                <span style={{ color: '#fff', fontSize: 15, lineHeight: 1 }}>+</span>
              </div>
            </div>
            <div style={{ padding: '7px 9px 8px' }}>
              <p style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                {item.name}
              </p>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#0d9488', margin: '4px 0 0' }}>
                {item.price}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Cart button */}
      <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0a0a0a' }}>
            🛒 {isEs ? 'Ver carrito' : 'View cart'}
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              color: '#fff',
              background: '#0d9488',
              borderRadius: 8,
              padding: '3px 8px',
            }}
          >
            $40.48
          </span>
        </div>
      </div>

      {/* Order notification — compact pill */}
      <div style={{ padding: '0 16px 8px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(13,148,136,0.15)',
            border: '1px solid rgba(13,148,136,0.3)',
            borderRadius: 999,
            padding: '5px 12px',
          }}
        >
          <span style={{ color: '#0d9488', fontSize: 9, fontWeight: 700 }}>✓</span>
          <span style={{ color: '#5eead4', fontSize: 8.5, fontWeight: 600 }}>
            {isEs ? 'Pedido enviado a cocina' : 'Order sent to kitchen!'}
          </span>
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8, flexShrink: 0 }}>
        <div style={{ width: 90, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }} />
      </div>
    </div>
  );
}

function PhoneFrame({ locale }: { locale: LandingLocale }) {
  return (
    <div style={{ position: 'relative', width: WIDTH, height: HEIGHT }}>
      <div
        style={{
          padding: 1.5,
          borderRadius: OUTER_RADIUS + 1,
          background: 'linear-gradient(145deg, #3a3a3a 0%, #1a1a1a 40%, #2a2a2a 100%)',
          height: '100%',
        }}
      >
        <div
          style={{
            padding: 5,
            borderRadius: OUTER_RADIUS,
            background: 'linear-gradient(160deg, #1e1e1e 0%, #111 100%)',
            height: '100%',
            boxShadow: AMBIENT_SHADOWS.join(', '),
          }}
        >
          <div
            style={{
              borderRadius: INNER_RADIUS,
              overflow: 'hidden',
              height: '100%',
              position: 'relative',
            }}
          >
            <DynamicIsland />
            <MenuScreen locale={locale} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: INNER_RADIUS,
                boxShadow: 'inset 0 0 2px 1px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: -3, top: HEIGHT * 0.22, width: 3, height: HEIGHT * 0.055, background: '#2a2a2a', borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', left: -3, top: HEIGHT * 0.295, width: 3, height: HEIGHT * 0.055, background: '#2a2a2a', borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', right: -3, top: HEIGHT * 0.225, width: 3, height: HEIGHT * 0.075, background: '#2a2a2a', borderRadius: '0 2px 2px 0' }} />
    </div>
  );
}

export function PhoneMockup({ locale }: { locale: LandingLocale }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateYMV = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]),
    { stiffness: 180, damping: 28 }
  );
  const rotateXMV = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]),
    { stiffness: 180, damping: 28 }
  );

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
      style={{ perspective: '1000px', cursor: 'default' }}
    >
      <motion.div
        style={{
          rotateX: rotateXMV,
          rotateY: rotateYMV,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        <PhoneFrame locale={locale} />
      </motion.div>
    </div>
  );
}
