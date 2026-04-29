/**
 * Celebration effects for order confirmation:
 * - Success chime (two-note ascending arpeggio)
 * - Haptic vibration pattern
 * - Canvas confetti burst
 */

// Run audio + vibration off the main thread so they never block UI / handlers.
// Some Android browsers serialize AudioContext creation on the main thread,
// which can delay rendering after a successful order on slow devices.
export function playSuccessChime() {
  if (typeof window === 'undefined') return;
  // Defer to next tick so the caller's render commits first.
  setTimeout(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const t = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = t + i * 0.1;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
      // Close the AudioContext after the chime finishes to release resources.
      setTimeout(() => { ctx.close().catch(() => {}); }, 800);
    } catch {}
    try { navigator.vibrate?.([40, 30, 40, 30, 60]); } catch {}
  }, 0);
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotSpeed: number;
  shape: 'rect' | 'circle';
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function spawnConfetti(container: HTMLElement) {
  // Mounted on document.body (NOT inside container) with position:fixed.
  // Some Android browsers (Samsung Internet, certain Chromium WebViews) can
  // ignore pointer-events:none on a child <canvas> with hardware acceleration,
  // which made overlapping buttons unclickable for the canvas's lifetime.
  // Keeping the canvas out of the interactive subtree sidesteps that entirely.
  const rect = container.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:50;`;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const particles: Particle[] = [];
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.35;

  for (let i = 0; i < 60; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 3 + Math.random() * 6;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }

  let frame = 0;
  const maxFrames = 90;

  function tick() {
    if (frame >= maxFrames) {
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.vy += 0.12;
      p.y += p.vy;
      p.alpha = Math.max(0, 1 - frame / maxFrames);
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    frame++;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
