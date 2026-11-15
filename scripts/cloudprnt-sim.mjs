#!/usr/bin/env node
// Simula una impresora Star CloudPRNT contra /api/cloudprnt/<secreto> (TASKS Sprint 3).
//
//   node scripts/cloudprnt-sim.mjs <url-de-la-impresora> [opciones]
//
//   <url-de-la-impresora>  https://menius.app/api/cloudprnt/<secreto> (la que da el panel)
//   --out <archivo.png>    dónde guardar el ticket (default: ./cloudprnt-ticket.png)
//   --code <código>        lo que "responde" la impresora en el DELETE (default: "200 OK")
//   --mac <mac>            MAC simulada (default: 00:11:62:00:00:01)
//   --setting              solo hace la consulta de configuración (GET sin type)
//
// Preview protegido de Vercel: exportar VERCEL_BYPASS=<secreto de bypass>.
// Sale con código 1 si algo no responde como dice el protocolo.
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:\/\//.test(a));
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
if (!url) {
  console.error('Uso: node scripts/cloudprnt-sim.mjs <url-de-la-impresora> [--out f.png] [--code "200 OK"] [--setting]');
  process.exit(2);
}

const mac = opt('mac', '00:11:62:00:00:01');
const out = opt('out', 'cloudprnt-ticket.png');
const code = opt('code', '200 OK');
const headers = process.env.VERCEL_BYPASS ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS } : {};
// El secreto va en la URL: nunca se imprime entero.
const safe = url.replace(/(cloudprnt\/)([^/?]{6})[^/?]*/, '$1$2…');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (args.includes('--setting')) {
  const r = await fetch(url, { headers });
  const body = await r.json().catch(() => null);
  console.log(`GET (configuración) ${safe} → ${r.status}`, body);
  if (r.status !== 200 || body?.serverSupportProtocol?.[0] !== 'HTTP') fail('la configuración no dice HTTP');
  process.exit(0);
}

// 1) Poll
const poll = await fetch(url, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: '23 86 00 00 00 00 00 00 00', printerMAC: mac, statusCode: '200%20OK', printingInProgress: false }),
});
if (poll.status === 404) fail(`POST ${safe} → 404 (secreto inválido o impresora inactiva)`);
const pollBody = await poll.json().catch(() => null);
console.log(`POST ${safe} → ${poll.status}`, pollBody);
if (poll.status !== 200 || typeof pollBody?.jobReady !== 'boolean') fail('el poll no devolvió { jobReady }');
if (!pollBody.jobReady) {
  console.log('Sin trabajos en la cola. (Acepta un pedido o pide "Imprimir prueba" y vuelve a correrlo.)');
  process.exit(0);
}
if (!pollBody.mediaTypes?.includes('image/png')) fail('el poll no ofrece image/png');

// 2) Job
const token = pollBody.jobToken ? `&token=${encodeURIComponent(pollBody.jobToken)}` : '';
const t0 = Date.now();
const job = await fetch(`${url}?mac=${encodeURIComponent(mac)}&type=image%2Fpng${token}`, { headers });
const bytes = Buffer.from(await job.arrayBuffer());
console.log(`GET job → ${job.status} ${job.headers.get('content-type')} ${bytes.length} bytes en ${Date.now() - t0} ms`);
if (job.status !== 200 || job.headers.get('content-type') !== 'image/png') fail('el GET no devolvió un PNG');
if (bytes.subarray(1, 4).toString() !== 'PNG') fail('lo que llegó no es un PNG');
console.log(`  ancho ${bytes.readUInt32BE(16)} px, alto ${bytes.readUInt32BE(20)} px, ${bytes[24]} bit`);
writeFileSync(out, bytes);
console.log(`  guardado en ${out}`);

// 3) Confirmación
const del = await fetch(`${url}?mac=${encodeURIComponent(mac)}&code=${encodeURIComponent(code)}${token}`, { method: 'DELETE', headers });
console.log(`DELETE (code=${code}) → ${del.status}`);
if (del.status !== 200) fail('el DELETE no devolvió 200');
console.log('✓ ciclo completo');
