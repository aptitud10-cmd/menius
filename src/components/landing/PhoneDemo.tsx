'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

const W = 270;
const H = Math.round(W * 2.165);
const R_OUTER = Math.round(W * 0.118);
const R_INNER = R_OUTER - 5;
const MAX_TILT = 10;

type Screen = 'qr' | 'menu' | 'product' | 'cart' | 'checkout' | 'tracking';

const SEQUENCE: Screen[] = ['qr', 'menu', 'product', 'cart', 'checkout', 'tracking'];
const DURATIONS: Record<Screen, number> = {
  qr: 2200,
  menu: 2800,
  product: 2400,
  cart: 2200,
  checkout: 2600,
  tracking: 3200,
};

/* ─── QR Screen ─── */
function ScreenQR() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1a1a1a 0%, #0d0d0d 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#ff6b35,#e8431a)', boxShadow: '0 4px 16px rgba(232,67,26,0.4)' }}>
          <span style={{ fontSize: 18 }}>🍽️</span>
        </div>
        <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>CASA DE TACOS</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, letterSpacing: '0.08em', marginTop: -6 }}>Mesa 4 · Zona Centro</p>

        {/* QR Code SVG */}
        <div className="relative" style={{ marginTop: 4 }}>
          <div style={{
            width: 100, height: 100, padding: 8,
            background: '#fff', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            <svg viewBox="0 0 21 21" width="84" height="84" style={{ display: 'block' }}>
              {/* QR finder pattern TL */}
              <rect x="0" y="0" width="7" height="7" rx="1" fill="#1a1a1a"/>
              <rect x="1" y="1" width="5" height="5" rx="0.5" fill="#fff"/>
              <rect x="2" y="2" width="3" height="3" rx="0.3" fill="#1a1a1a"/>
              {/* QR finder pattern TR */}
              <rect x="14" y="0" width="7" height="7" rx="1" fill="#1a1a1a"/>
              <rect x="15" y="1" width="5" height="5" rx="0.5" fill="#fff"/>
              <rect x="16" y="2" width="3" height="3" rx="0.3" fill="#1a1a1a"/>
              {/* QR finder pattern BL */}
              <rect x="0" y="14" width="7" height="7" rx="1" fill="#1a1a1a"/>
              <rect x="1" y="15" width="5" height="5" rx="0.5" fill="#fff"/>
              <rect x="2" y="16" width="3" height="3" rx="0.3" fill="#1a1a1a"/>
              {/* QR data modules */}
              {[
                [8,0],[9,0],[10,0],[9,1],[11,1],[13,1],
                [8,2],[10,2],[12,2],[9,3],[11,3],[13,3],
                [8,4],[10,4],[12,4],[8,5],[11,5],
                [8,6],[9,6],[12,6],[13,6],
                [0,8],[2,8],[4,8],[6,8],[8,8],[10,8],[12,8],[14,8],[16,8],[18,8],[20,8],
                [1,9],[3,9],[7,9],[9,9],[11,9],[15,9],[17,9],[19,9],
                [0,10],[2,10],[6,10],[8,10],[10,10],[14,10],[18,10],[20,10],
                [1,11],[5,11],[9,11],[13,11],[17,11],
                [0,12],[4,12],[8,12],[10,12],[12,12],[16,12],[18,12],[20,12],
                [9,13],[11,13],[14,13],[16,13],[18,13],
                [8,14],[12,14],[13,14],[16,14],[20,14],
                [9,15],[11,15],[15,15],[17,15],[19,15],
                [8,16],[10,16],[12,16],[14,16],[16,16],[18,16],[20,16],
                [9,17],[11,17],[13,17],[15,17],[19,17],
                [8,18],[10,18],[14,18],[16,18],[18,18],
                [9,19],[13,19],[15,19],[17,19],[19,19],[20,19],
                [8,20],[10,20],[12,20],[14,20],[16,20],[18,20],
              ].map(([cx, cy], i) => (
                <rect key={i} x={cx} y={cy} width="1" height="1" fill="#1a1a1a"/>
              ))}
            </svg>
          </div>
          {/* Scan animation */}
          <motion.div
            animate={{ y: [0, 84, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', left: 8, right: 8,
              height: 2, borderRadius: 1,
              background: 'linear-gradient(90deg, transparent, #ff6b35, transparent)',
              top: 8,
            }}
          />
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textAlign: 'center', lineHeight: 1.5, marginTop: 4 }}>
          Escanea con tu cámara<br/>para ver el menú
        </p>
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            padding: '6px 16px', borderRadius: 99,
            background: 'rgba(255,107,53,0.15)',
            border: '1px solid rgba(255,107,53,0.3)',
            color: '#ff6b35', fontSize: 9, fontWeight: 700,
          }}
        >
          📲 Menú digital activo
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Menu Screen ─── */
function ScreenMenu() {
  const items = [
    { name: 'Tacos al Pastor', price: '$89', emoji: '🌮', popular: true, desc: 'Con piña y cilantro' },
    { name: 'Guacamole + Totopos', price: '$65', emoji: '🥑', popular: false, desc: 'Hecho al momento' },
    { name: 'Agua de Jamaica', price: '$35', emoji: '🫖', popular: false, desc: 'Natural, sin azúcar' },
  ];

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#FAFAF8' }}>
      {/* Status */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#1a1a1a' }}>9:41</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <svg width="11" height="7" viewBox="0 0 11 7"><rect x="0" y="4" width="2" height="3" rx="0.4" fill="#1a1a1a"/><rect x="3" y="2.5" width="2" height="4.5" rx="0.4" fill="#1a1a1a"/><rect x="6" y="1" width="2" height="6" rx="0.4" fill="#1a1a1a"/><rect x="9" y="0" width="2" height="7" rx="0.4" fill="#1a1a1a"/></svg>
          <svg width="14" height="7" viewBox="0 0 14 7"><rect x="0.5" y="0.5" width="11" height="6" rx="1.2" stroke="#1a1a1a" strokeOpacity="0.35" fill="none"/><rect x="12" y="2" width="1.5" height="3" rx="0.6" fill="#1a1a1a" fillOpacity="0.35"/><rect x="1.5" y="1.5" width="8" height="4" rx="0.6" fill="#1a1a1a"/></svg>
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: '6px 16px 8px', textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#ff6b35,#e8431a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', boxShadow: '0 3px 10px rgba(232,67,26,0.3)', fontSize: 15 }}>🍽️</div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a' }}>Casa de Tacos</p>
        <p style={{ fontSize: 8, color: '#999', marginTop: 1 }}>⭐ 4.9 · Mesa 4 · Zona Centro</p>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'hidden' }}>
        {['Popular', 'Tacos', 'Bebidas', 'Postres'].map((cat, i) => (
          <span key={cat} style={{
            padding: '4px 10px', borderRadius: 99, fontSize: 9, fontWeight: 600,
            flexShrink: 0,
            background: i === 0 ? '#ff6b35' : 'rgba(0,0,0,0.05)',
            color: i === 0 ? '#fff' : '#888',
          }}>{cat}</span>
        ))}
      </div>

      {/* Items */}
      <div style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, idx) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx, duration: 0.3 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 8px', borderRadius: 10,
              background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,107,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{item.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#1a1a1a' }}>{item.name}</p>
                {item.popular && <span style={{ padding: '1px 4px', borderRadius: 3, background: 'rgba(255,107,53,0.1)', color: '#ff6b35', fontSize: 7, fontWeight: 700 }}>TOP</span>}
              </div>
              <p style={{ fontSize: 8, color: '#aaa', marginTop: 1 }}>{item.desc}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#1a1a1a' }}>{item.price}</p>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: '#ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 3, marginLeft: 'auto', boxShadow: '0 2px 6px rgba(255,107,53,0.35)' }}>
                <span style={{ color: '#fff', fontSize: 12, lineHeight: 1, marginTop: -1 }}>+</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom indicator */}
      <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 70, height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.1)' }} />
      </div>
    </div>
  );
}

/* ─── Product Screen ─── */
function ScreenProduct() {
  return (
    <div className="absolute inset-0" style={{ background: '#FAFAF8' }}>
      {/* Blurred menu behind */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1 }} />

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: H * 0.6 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
          background: '#fff', borderRadius: '18px 18px 0 0',
          padding: '12px 14px 20px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ width: 32, height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.12)', margin: '0 auto 10px' }} />

        {/* Product image */}
        <div style={{ width: '100%', height: 80, borderRadius: 12, background: 'linear-gradient(135deg,rgba(255,107,53,0.12),rgba(232,67,26,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 44 }}>🌮</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Tacos al Pastor</p>
            <p style={{ fontSize: 9, color: '#aaa', marginTop: 2, maxWidth: 130, lineHeight: 1.4 }}>Con piña asada, cilantro y salsa verde. 3 piezas.</p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#ff6b35' }}>$89</p>
        </div>

        {/* Quantity selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 600, color: '#888' }}>Cantidad</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#666' }}>−</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>1</p>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: '#ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', boxShadow: '0 2px 8px rgba(255,107,53,0.4)' }}>+</div>
          </div>
        </div>

        {/* Add to cart CTA */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          style={{
            marginTop: 12, padding: '10px 0', borderRadius: 11, textAlign: 'center',
            background: 'linear-gradient(135deg,#ff6b35,#e8431a)',
            boxShadow: '0 4px 16px rgba(232,67,26,0.4)',
            color: '#fff', fontSize: 11, fontWeight: 700,
          }}
        >
          Agregar al carrito · $89
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ─── Cart Screen ─── */
function ScreenCart() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#FAFAF8' }}>
      <div style={{ padding: '14px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>Tu pedido</p>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛒</div>
      </div>

      <div style={{ flex: 1, padding: '4px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { emoji: '🌮', name: 'Tacos al Pastor', qty: 2, price: '$178' },
          { emoji: '🥑', name: 'Guacamole + Totopos', qty: 1, price: '$65' },
          { emoji: '🫖', name: 'Agua de Jamaica', qty: 1, price: '$35' },
        ].map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px', borderRadius: 10,
              background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <span style={{ fontSize: 18 }}>{item.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#1a1a1a' }}>{item.name}</p>
              <p style={{ fontSize: 8, color: '#bbb', marginTop: 1 }}>×{item.qty}</p>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#1a1a1a' }}>{item.price}</p>
          </motion.div>
        ))}
      </div>

      <div style={{ padding: '8px 14px' }}>
        <div style={{ padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {[['Subtotal', '$278'], ['0% comisión Menius', '-$0'], ['Total', '$278']].map(([label, val], i) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: i === 2 ? 11 : 9, fontWeight: i === 2 ? 700 : 400, color: i === 2 ? '#1a1a1a' : '#999' }}>{label}</p>
              <p style={{ fontSize: i === 2 ? 11 : 9, fontWeight: i === 2 ? 800 : 500, color: i === 1 ? '#22c55e' : (i === 2 ? '#1a1a1a' : '#999') }}>{val}</p>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 0', borderRadius: 11, textAlign: 'center', background: 'linear-gradient(135deg,#ff6b35,#e8431a)', color: '#fff', fontSize: 11, fontWeight: 700, boxShadow: '0 4px 14px rgba(232,67,26,0.35)' }}>
          Ir a pagar →
        </div>
        <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 70, height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.1)' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Checkout Screen ─── */
function ScreenCheckout({ phase }: { phase: 'form' | 'processing' | 'success' }) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#FAFAF8' }}>
      <div style={{ padding: '14px 14px 8px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>Confirmar pedido</p>
        <p style={{ fontSize: 9, color: '#bbb', marginTop: 2 }}>Casa de Tacos · Mesa 4</p>
      </div>

      {phase === 'form' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: '9px 10px', borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 7, color: '#bbb', fontWeight: 500, marginBottom: 2 }}>NOMBRE</p>
            <p style={{ fontSize: 10, color: '#1a1a1a', fontWeight: 500 }}>Carlos Ramírez</p>
          </div>
          <div style={{ padding: '9px 10px', borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 7, color: '#bbb', fontWeight: 500, marginBottom: 2 }}>MESA</p>
            <p style={{ fontSize: 10, color: '#1a1a1a', fontWeight: 500 }}>Mesa 4 · Zona Centro</p>
          </div>
          <div style={{ padding: '9px 10px', borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 7, color: '#bbb', fontWeight: 500, marginBottom: 2 }}>PAGO</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 16, borderRadius: 3, background: 'linear-gradient(135deg,#1a6fc4,#1455a2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 8, color: '#fff', fontWeight: 800, fontStyle: 'italic' }}>V</span>
              </div>
              <p style={{ fontSize: 10, color: '#1a1a1a', fontWeight: 500 }}>Pagar en mesa</p>
            </div>
          </div>
          <div style={{ padding: '10px 0', borderRadius: 11, textAlign: 'center', background: 'linear-gradient(135deg,#ff6b35,#e8431a)', color: '#fff', fontSize: 11, fontWeight: 700, boxShadow: '0 4px 14px rgba(232,67,26,0.35)', marginTop: 4 }}>
            Enviar pedido · $278
          </div>
        </motion.div>
      )}

      {phase === 'processing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,107,53,0.2)', borderTopColor: '#ff6b35' }}
          />
          <p style={{ fontSize: 10, color: '#999', fontWeight: 500 }}>Enviando pedido...</p>
        </motion.div>
      )}

      {phase === 'success' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(34,197,94,0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>¡Pedido enviado!</p>
          <p style={{ fontSize: 9, color: '#bbb', textAlign: 'center' }}>Tu pedido #0042 está siendo preparado</p>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Tracking Screen ─── */
function ScreenTracking({ step }: { step: number }) {
  const statuses = [
    { label: 'Pedido recibido', emoji: '✅', done: step >= 0 },
    { label: 'En preparación', emoji: '👨‍🍳', done: step >= 1, active: step === 1 },
    { label: 'Listo para servir', emoji: '🍽️', done: step >= 2, active: step === 2 },
    { label: 'Entregado', emoji: '⭐', done: step >= 3 },
  ];

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#FAFAF8' }}>
      <div style={{ padding: '14px 14px 8px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a' }}>Seguimiento</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <p style={{ fontSize: 9, color: '#bbb' }}>Pedido #0042 · Mesa 4</p>
          <div style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(255,107,53,0.1)', color: '#ff6b35', fontSize: 8, fontWeight: 700 }}>~12 min</div>
        </div>
      </div>

      {/* Progress timeline */}
      <div style={{ padding: '8px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {statuses.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', gap: 10, position: 'relative' }}>
            {/* Vertical line */}
            {i < statuses.length - 1 && (
              <div style={{
                position: 'absolute', left: 14, top: 28, width: 2, height: 28,
                background: s.done ? '#ff6b35' : 'rgba(0,0,0,0.08)',
                transition: 'background 0.5s',
              }} />
            )}
            {/* Circle */}
            <motion.div
              animate={s.active ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                background: s.done ? (i === 0 ? '#22c55e' : '#ff6b35') : 'rgba(0,0,0,0.06)',
                boxShadow: s.active ? '0 0 0 4px rgba(255,107,53,0.15)' : 'none',
                zIndex: 1,
              }}
            >
              {s.done ? s.emoji : <span style={{ fontSize: 10, color: '#ccc' }}>{i + 1}</span>}
            </motion.div>
            {/* Text */}
            <div style={{ paddingTop: 6, paddingBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: s.active ? 700 : 500, color: s.done ? '#1a1a1a' : '#ccc' }}>{s.label}</p>
              {s.active && (
                <motion.p
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ fontSize: 8, color: '#ff6b35', marginTop: 1 }}
                >
                  En proceso...
                </motion.p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 14px 12px' }}>
        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          <p style={{ fontSize: 9, color: '#ff6b35', fontWeight: 500 }}>Te avisamos cuando esté listo</p>
        </div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 70, height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.1)' }} />
        </div>
      </div>
    </div>
  );
}

/* ─── iPhone Frame ─── */
function iPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: W, height: H, position: 'relative' }}>
      {/* Outer bevel */}
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
          boxShadow: [
            '0 1px 2px rgba(0,0,0,0.18)',
            '0 2px 4px rgba(0,0,0,0.14)',
            '0 4px 8px rgba(0,0,0,0.12)',
            '0 8px 16px 2px rgba(0,0,0,0.10)',
            '0 16px 32px 6px rgba(0,0,0,0.08)',
            '0 32px 64px 12px rgba(0,0,0,0.06)',
            '0 48px 96px 20px rgba(0,0,0,0.04)',
            '0 0 0 1px rgba(255,255,255,0.04) inset',
          ].join(','),
        }}>
          {/* Screen */}
          <div style={{
            borderRadius: R_INNER,
            overflow: 'hidden',
            height: '100%',
            position: 'relative',
            lineHeight: 0,
            background: '#FAFAF8',
          }}>
            {children}
            {/* Dynamic Island */}
            <div style={{
              position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)',
              width: W * 0.33, height: W * 0.088,
              borderRadius: 999, background: '#1c1c1e', zIndex: 100,
            }} />
            {/* Inset shadow */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: R_INNER,
              boxShadow: 'inset 0 0 4px 1px rgba(0,0,0,0.35)',
              pointerEvents: 'none', zIndex: 101,
            }} />
            {/* Glass shine */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: R_INNER,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 50%)',
              pointerEvents: 'none', zIndex: 102,
            }} />
          </div>
        </div>
      </div>

      {/* Side button: volume up */}
      <div style={{ position: 'absolute', left: -3, top: H * 0.21, width: 3, height: H * 0.06, background: 'linear-gradient(to right,#555,#3a3a3a)', borderRadius: '2px 0 0 2px' }} />
      {/* Side button: volume down */}
      <div style={{ position: 'absolute', left: -3, top: H * 0.28, width: 3, height: H * 0.06, background: 'linear-gradient(to right,#555,#3a3a3a)', borderRadius: '2px 0 0 2px' }} />
      {/* Side button: power */}
      <div style={{ position: 'absolute', right: -3, top: H * 0.21, width: 3, height: H * 0.085, background: 'linear-gradient(to left,#555,#3a3a3a)', borderRadius: '0 2px 2px 0' }} />
    </div>
  );
}

/* ─── Progress indicator ─── */
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 20 : 5, background: i === current ? '#ff6b35' : 'rgba(255,255,255,0.2)' }}
          transition={{ duration: 0.3 }}
          style={{ height: 5, borderRadius: 99 }}
        />
      ))}
    </div>
  );
}

/* ─── Main component ─── */
export function PhoneDemo() {
  const [screenIdx, setScreenIdx] = useState(0);
  const [checkoutPhase, setCheckoutPhase] = useState<'form' | 'processing' | 'success'>('form');
  const [trackingStep, setTrackingStep] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), { stiffness: 180, damping: 28 });
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), { stiffness: 180, damping: 28 });
  const shineX = useTransform(rotateY, [-MAX_TILT, MAX_TILT], [W * 0.04, -(W * 0.04)]);
  const shineY = useTransform(rotateX, [-MAX_TILT, MAX_TILT], [-(W * 0.04), W * 0.04]);

  const currentScreen = SEQUENCE[screenIdx];

  // Auto-advance screens
  useEffect(() => {
    if (currentScreen === 'checkout') {
      setCheckoutPhase('form');
      const t1 = setTimeout(() => setCheckoutPhase('processing'), 1200);
      const t2 = setTimeout(() => setCheckoutPhase('success'), 2000);
      const t3 = setTimeout(() => {
        setScreenIdx((i) => (i + 1) % SEQUENCE.length);
      }, DURATIONS.checkout);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }

    if (currentScreen === 'tracking') {
      setTrackingStep(0);
      const t1 = setTimeout(() => setTrackingStep(1), 800);
      const t2 = setTimeout(() => setTrackingStep(2), 2000);
      const t3 = setTimeout(() => {
        setScreenIdx(0); // loop back
      }, DURATIONS.tracking);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }

    const timer = setTimeout(() => {
      setScreenIdx((i) => (i + 1) % SEQUENCE.length);
    }, DURATIONS[currentScreen]);
    return () => clearTimeout(timer);
  }, [currentScreen]);

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

  const variants = {
    enter: { opacity: 0, y: 12, scale: 0.98 },
    center: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -12, scale: 0.98 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: '900px' }}
      >
        <motion.div
          style={{
            rotateX, rotateY,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            position: 'relative',
          }}
        >
          {iPhoneFrame({
            children: (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentScreen}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    {currentScreen === 'qr' && <ScreenQR />}
                    {currentScreen === 'menu' && <ScreenMenu />}
                    {currentScreen === 'product' && <ScreenProduct />}
                    {currentScreen === 'cart' && <ScreenCart />}
                    {currentScreen === 'checkout' && <ScreenCheckout phase={checkoutPhase} />}
                    {currentScreen === 'tracking' && <ScreenTracking step={trackingStep} />}
                  </motion.div>
                </AnimatePresence>

                {/* Shine overlay — reacts to mouse */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: -(W * 0.25), left: -(W * 0.25),
                    right: -(W * 0.25), bottom: -(W * 0.25),
                    background: 'linear-gradient(155deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.09) 35%, rgba(255,255,255,0) 35%)',
                    x: shineX, y: shineY,
                    pointerEvents: 'none', zIndex: 103,
                  }}
                />
              </>
            ),
          })}
        </motion.div>
      </div>

      <ProgressDots current={screenIdx} total={SEQUENCE.length} />
    </div>
  );
}
