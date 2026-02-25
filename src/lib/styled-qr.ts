import type QRCodeStyling from 'qr-code-styling';

let QRModule: typeof QRCodeStyling | null = null;

async function getQRModule() {
  if (QRModule) return QRModule;
  const mod = await import('qr-code-styling');
  QRModule = mod.default;
  return QRModule;
}

export interface StyledQROptions {
  data: string;
  size?: number;
  dotColor?: string;
  cornerColor?: string;
  bgColor?: string;
}

export async function renderStyledQR(
  container: HTMLElement,
  { data, size = 220, dotColor = '#111827', cornerColor = '#059669', bgColor = '#ffffff' }: StyledQROptions
) {
  const QR = await getQRModule();
  const qr = new QR({
    width: size,
    height: size,
    data,
    dotsOptions: {
      color: dotColor,
      type: 'rounded',
    },
    cornersSquareOptions: {
      color: cornerColor,
      type: 'extra-rounded',
    },
    cornersDotOptions: {
      color: cornerColor,
      type: 'dot',
    },
    backgroundOptions: {
      color: bgColor,
    },
    qrOptions: {
      errorCorrectionLevel: 'H',
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 4,
    },
  });

  container.innerHTML = '';
  qr.append(container);
  return qr;
}

export async function generateBrandedCard(
  qrData: string,
  label: string,
  restaurantName: string,
  subtitle: string
): Promise<HTMLCanvasElement> {
  const QR = await getQRModule();
  const scale = 3;
  const w = 320 * scale;
  const h = 440 * scale;
  const pad = 40 * scale;
  const qrPixelSize = 240 * scale;

  const qr = new QR({
    width: qrPixelSize,
    height: qrPixelSize,
    data: qrData,
    dotsOptions: { color: '#111827', type: 'rounded' },
    cornersSquareOptions: { color: '#059669', type: 'extra-rounded' },
    cornersDotOptions: { color: '#059669', type: 'dot' },
    backgroundOptions: { color: '#ffffff' },
    qrOptions: { errorCorrectionLevel: 'H' },
  });

  const qrCanvas = await new Promise<HTMLCanvasElement>((resolve) => {
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:absolute;left:-9999px;';
    document.body.appendChild(tempDiv);
    qr.append(tempDiv);
    setTimeout(() => {
      const cvs = tempDiv.querySelector('canvas');
      if (cvs) resolve(cvs);
      document.body.removeChild(tempDiv);
    }, 300);
  });

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 24 * scale);
  ctx.fill();

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.roundRect(0.5 * scale, 0.5 * scale, w - 1 * scale, h - 1 * scale, 24 * scale);
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.font = `bold ${11 * scale}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = `${4 * scale}px`;
  ctx.fillText('MENIUS', w / 2, 36 * scale);
  ctx.letterSpacing = '0px';

  if (restaurantName) {
    ctx.fillStyle = '#111827';
    ctx.font = `600 ${14 * scale}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(restaurantName, w / 2, 58 * scale);
  }

  const sep1Y = 72 * scale;
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(pad, sep1Y);
  ctx.lineTo(w - pad, sep1Y);
  ctx.stroke();

  const qrX = (w - qrPixelSize) / 2;
  const qrY = 84 * scale;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(qrX - 8 * scale, qrY - 8 * scale, qrPixelSize + 16 * scale, qrPixelSize + 16 * scale, 16 * scale);
  ctx.fillStyle = '#fafafa';
  ctx.fill();
  ctx.restore();

  ctx.drawImage(qrCanvas, qrX, qrY, qrPixelSize, qrPixelSize);

  const belowQR = qrY + qrPixelSize + 24 * scale;
  ctx.fillStyle = '#111827';
  ctx.font = `bold ${20 * scale}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, w / 2, belowQR);

  ctx.fillStyle = '#6b7280';
  ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(subtitle, w / 2, belowQR + 20 * scale);

  return canvas;
}
