'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { LandingLocale } from '@/lib/landing-translations';

const W = 288;
const H = Math.round(W * 2.165);
const R_OUT = Math.round(W * 0.114);
const R_IN = R_OUT - 4;
const TILT = 9;

const SHADOWS = [
  '0 4px 6px rgba(0,0,0,0.3)',
  '0 10px 20px rgba(0,0,0,0.25)',
  '0 20px 40px rgba(0,0,0,0.18)',
  '0 40px 70px rgba(0,0,0,0.12)',
  '0 0 60px 2px rgba(13,148,136,0.06)',
].join(', ');

/* ─── Static content ─────────────────────────────────────── */

function StatusBar() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 0', flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Bars */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <rect x="0" y="7"   width="3" height="4"  rx="0.8" fill="rgba(255,255,255,0.85)" />
          <rect x="4.5" y="4.5" width="3" height="6.5" rx="0.8" fill="rgba(255,255,255,0.85)" />
          <rect x="9"   y="2"   width="3" height="9"  rx="0.8" fill="rgba(255,255,255,0.85)" />
          <rect x="13.5" y="0" width="2.5" height="11" rx="0.8" fill="rgba(255,255,255,0.35)" />
        </svg>
        {/* Battery */}
        <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
          <rect x="0.5" y="0.5" width="16" height="9" rx="2.2" stroke="rgba(255,255,255,0.35)" />
          <rect x="17" y="3"   width="2.5" height="4" rx="1.2" fill="rgba(255,255,255,0.35)" />
          <rect x="1.5" y="1.5" width="12" height="7" rx="1.5" fill="#0d9488" />
        </svg>
      </div>
    </div>
  );
}

function RestaurantHeader({ isEs }: { isEs: boolean }) {
  return (
    <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: '#0d9488',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 3px 12px rgba(13,148,136,0.45)',
      }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>M</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          La Taquería
        </p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', letterSpacing: '0.1px' }}>
          {isEs ? 'Mesa 5  ·  Menú digital' : 'Table 5  ·  Digital menu'}
        </p>
      </div>
      {/* Star rating */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="#f59e0b">
          <path d="M5 0.5l1.2 2.5 2.8.4-2 2 .5 2.8L5 6.9 2.5 8.2 3 5.4 1 3.4l2.8-.4z" />
        </svg>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>4.9</span>
      </div>
    </div>
  );
}

function CategoryTabs({ categories, isEs }: { categories: string[]; isEs: boolean }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ display: 'flex', padding: '10px 20px 0', gap: 0 }}>
        {categories.map((cat, i) => (
          <div key={cat} style={{ flex: 1, textAlign: 'center', paddingBottom: 8, position: 'relative' }}>
            <span style={{
              fontSize: 9.5,
              fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? '#fff' : 'rgba(255,255,255,0.3)',
              letterSpacing: '0.1px',
            }}>{cat}</span>
            {i === 0 && (
              <div style={{
                position: 'absolute', bottom: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 20, height: 2, borderRadius: 99,
                background: '#0d9488',
              }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 0' }} />
    </div>
  );
}

function PhotoPlaceholder({ index }: { index: number }) {
  const tones = ['#1c1c1c', '#1a1a1a', '#1e1c1a', '#1a1c1e'];
  return (
    <div style={{
      width: 50, height: 50, borderRadius: 10, flexShrink: 0,
      background: tones[index % tones.length],
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Subtle shimmer lines to simulate a loading image */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 60%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
      }} />
    </div>
  );
}

function MenuItem({
  name, desc, price, popular, index, last,
}: {
  name: string; desc: string; price: string; popular?: boolean; index: number; last?: boolean;
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px' }}>
        <PhotoPlaceholder index={index} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: '#f0f0f0', margin: 0, lineHeight: 1.25 }}>
              {name}
            </p>
            {popular && (
              <span style={{
                fontSize: 6.5, fontWeight: 800, color: '#fff',
                background: '#f59e0b', borderRadius: 4,
                padding: '1.5px 4px', letterSpacing: '0.3px', flexShrink: 0,
              }}>★ TOP</span>
            )}
          </div>
          <p style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0', lineHeight: 1.3 }}>
            {desc}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>{price}</span>
          <div style={{
            width: 22, height: 22, borderRadius: 7,
            background: '#0d9488',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(13,148,136,0.4)',
          }}>
            <span style={{ color: '#fff', fontSize: 14, lineHeight: 1, fontWeight: 300 }}>+</span>
          </div>
        </div>
      </div>
      {!last && <div style={{ height: 1, background: 'rgba(255,255,255,0.045)', margin: '0 20px' }} />}
    </>
  );
}

function MenuScreen({ locale }: { locale: LandingLocale }) {
  const isEs = locale === 'es';

  // Toast loop: visible 3.5s, hidden 3.5s
  const [showToast, setShowToast] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setShowToast((v) => !v), 3500);
    return () => clearInterval(id);
  }, []);

  const items = [
    { name: 'Tacos al Pastor',    price: '$12.99', desc: isEs ? 'Piña, cilantro, cebolla'       : 'Pineapple, cilantro, onion',     popular: true  },
    { name: 'Fresh Guacamole',    price: '$8.50',  desc: isEs ? 'Aguacate, jitomate, limón'      : 'Avocado, tomato, lime',          popular: false },
    { name: 'Enchiladas Suizas',  price: '$14.99', desc: isEs ? 'Pollo, salsa verde, queso'      : 'Chicken, green salsa, cheese',   popular: false },
    { name: 'Horchata',           price: '$4.00',  desc: isEs ? 'Arroz, canela, vainilla'        : 'Rice, cinnamon, vanilla',        popular: false },
  ];

  const categories = isEs
    ? ['Popular', 'Tacos', 'Bebidas', 'Postres']
    : ['Popular', 'Tacos', 'Drinks', 'Desserts'];

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: '#0d0d0d' }}
    >
      <StatusBar />

      {/* Dynamic island spacer */}
      <div style={{ height: 16, flexShrink: 0 }} />

      <RestaurantHeader isEs={isEs} />

      <div style={{ height: 14, flexShrink: 0 }} />

      <CategoryTabs categories={categories} isEs={isEs} />

      {/* Items */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {items.map((item, i) => (
          <MenuItem key={item.name} {...item} index={i} last={i === items.length - 1} />
        ))}
      </div>

      {/* Cart CTA — pulsing badge */}
      <div style={{ padding: '8px 16px 6px', flexShrink: 0 }}>
        <motion.div
          animate={{ scale: [1, 1.025, 1], boxShadow: [
            '0 0 0 0 rgba(13,148,136,0)',
            '0 0 0 6px rgba(13,148,136,0.15)',
            '0 0 0 0 rgba(13,148,136,0)',
          ] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: '#0d9488',
            borderRadius: 14,
            padding: '11px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '-0.1px' }}>
            {isEs ? '🛒 Ver carrito' : '🛒 View cart'}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, color: '#0d9488',
            background: '#fff', borderRadius: 8, padding: '3px 9px',
          }}>
            $40.48
          </span>
        </motion.div>
      </div>

      {/* Order confirmation — appears every ~7s */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 16px 6px', flexShrink: 0, minHeight: 24 }}>
        <AnimatePresence mode="wait">
          {showToast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(13,148,136,0.12)',
                border: '1px solid rgba(13,148,136,0.25)',
                borderRadius: 999, padding: '5px 14px',
              }}
            >
              <span style={{ color: '#0d9488', fontSize: 9, fontWeight: 700 }}>✓</span>
              <span style={{ color: '#5eead4', fontSize: 8.5, fontWeight: 600, letterSpacing: '0.1px' }}>
                {isEs ? 'Pedido enviado a cocina' : 'Order sent to kitchen!'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Home indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 10px', flexShrink: 0 }}>
        <div style={{ width: 100, height: 3.5, borderRadius: 99, background: 'rgba(255,255,255,0.14)' }} />
      </div>
    </div>
  );
}

/* ─── Phone frame ────────────────────────────────────────── */

function PhoneFrame({ locale }: { locale: LandingLocale }) {
  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      {/* Titanium outer ring */}
      <div style={{
        padding: 1.5,
        borderRadius: R_OUT + 2,
        background: 'linear-gradient(150deg, #424242 0%, #1c1c1c 45%, #333 100%)',
        height: '100%',
      }}>
        {/* Body */}
        <div style={{
          padding: 5,
          borderRadius: R_OUT,
          background: '#141414',
          height: '100%',
          boxShadow: SHADOWS,
        }}>
          {/* Screen */}
          <div style={{ borderRadius: R_IN, overflow: 'hidden', height: '100%', position: 'relative' }}>
            {/* Dynamic Island */}
            <div style={{
              position: 'absolute', top: 10, left: '50%',
              transform: 'translateX(-50%)',
              width: W * 0.31, height: W * 0.082,
              borderRadius: 999, background: '#000', zIndex: 10,
            }} />
            <MenuScreen locale={locale} />
            {/* Inset edge shadow only — no shine */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: R_IN,
              boxShadow: 'inset 0 0 2px 1px rgba(0,0,0,0.6)',
              pointerEvents: 'none', zIndex: 20,
            }} />
          </div>
        </div>
      </div>

      {/* Side buttons */}
      <div style={{ position: 'absolute', left: -2.5, top: H * 0.215, width: 2.5, height: H * 0.052, background: '#2c2c2c', borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', left: -2.5, top: H * 0.29,  width: 2.5, height: H * 0.052, background: '#2c2c2c', borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', right: -2.5, top: H * 0.225, width: 2.5, height: H * 0.072, background: '#2c2c2c', borderRadius: '0 2px 2px 0' }} />
    </div>
  );
}

/* ─── Export ─────────────────────────────────────────────── */

export function PhoneMockup({ locale }: { locale: LandingLocale }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-TILT, TILT]), { stiffness: 160, damping: 26 });
  const rotX = useSpring(useTransform(mouseY, [-0.5, 0.5], [TILT, -TILT]), { stiffness: 160, damping: 26 });

  return (
    <div
      ref={containerRef}
      style={{ perspective: '1100px', cursor: 'default' }}
      onMouseMove={(e) => {
        const r = containerRef.current?.getBoundingClientRect();
        if (!r) return;
        mouseX.set((e.clientX - r.left) / r.width - 0.5);
        mouseY.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
    >
      <motion.div
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d', willChange: 'transform' }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <PhoneFrame locale={locale} />
      </motion.div>
    </div>
  );
}
