import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { UUID_RE } from '@/lib/constants';
import { createLogger } from '@/lib/logger';

const logger = createLogger('billing-cfdi');

const CFDI_USES = [
  'G01', 'G02', 'G03', 'I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08',
  'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10',
  'S01', 'CN01', 'CP01',
];

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = await checkRateLimitAsync(`cfdi:${ip}`, { limit: 5, windowSec: 300 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes, intenta más tarde' }, { status: 429 });
    }

    const body = await req.json();
    const { orderId, restaurantId, rfc, razonSocial, cfdiUse, regimenFiscal, cpDomicilio } = body;

    // Basic validation
    if (!orderId || !restaurantId) {
      return NextResponse.json({ error: 'Faltan datos de la orden' }, { status: 400 });
    }
    if (!UUID_RE.test(String(orderId)) || !UUID_RE.test(String(restaurantId))) {
      return NextResponse.json({ error: 'ID de orden o restaurante inválido' }, { status: 400 });
    }
    if (!rfc || !RFC_REGEX.test(rfc.trim())) {
      return NextResponse.json({ error: 'RFC inválido' }, { status: 400 });
    }
    if (!razonSocial?.trim() || String(razonSocial).length > 300) {
      return NextResponse.json({ error: 'La razón social es requerida (máx 300 chars)' }, { status: 400 });
    }
    if (!cfdiUse || !CFDI_USES.includes(cfdiUse)) {
      return NextResponse.json({ error: 'Uso de CFDI inválido' }, { status: 400 });
    }
    if (!regimenFiscal?.trim() || String(regimenFiscal).length > 10) {
      return NextResponse.json({ error: 'El régimen fiscal es requerido (máx 10 chars)' }, { status: 400 });
    }
    if (cpDomicilio && String(cpDomicilio).length > 10) {
      return NextResponse.json({ error: 'CP domicilio inválido' }, { status: 400 });
    }

    const supabase = createClient();

    // Verify order exists and belongs to the restaurant
    const { data: order } = await supabase
      .from('orders')
      .select('id, total, order_number, status')
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Solo se puede facturar órdenes entregadas' }, { status: 400 });
    }

    // Check for existing CFDI request for this order (issued or pending)
    const { data: existing } = await supabase
      .from('cfdi_requests')
      .select('id, status, xml_url, pdf_url')
      .eq('order_id', orderId)
      .in('status', ['issued', 'pending'])
      .maybeSingle();

    if (existing) {
      if (existing.status === 'issued') {
        return NextResponse.json({
          success: true,
          alreadyIssued: true,
          cfdi: existing,
        });
      }
      // Already has a pending request — prevent duplicate submissions
      return NextResponse.json({
        success: true,
        pending: true,
        message: 'Ya tienes una solicitud de factura en proceso para esta orden.',
        cfdiId: existing.id,
      });
    }

    // Check restaurant fiscal config
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('fiscal_rfc, fiscal_razon_social, fiscal_regimen_fiscal, fiscal_lugar_expedicion')
      .eq('id', restaurantId)
      .maybeSingle();

    const facturamaUser = process.env.FACTURAMA_USER;
    const facturamaPassword = process.env.FACTURAMA_PASSWORD;

    // Save the request regardless (so restaurant can see pending requests)
    const { data: cfdiRecord, error: insertError } = await supabase
      .from('cfdi_requests')
      .insert({
        order_id: orderId,
        restaurant_id: restaurantId,
        rfc: rfc.trim().toUpperCase(),
        razon_social: razonSocial.trim(),
        cfdi_use: cfdiUse,
        regimen_fiscal: regimenFiscal.trim(),
        cp_domicilio: cpDomicilio?.trim() || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Error al guardar la solicitud' }, { status: 500 });
    }

    // If Facturama is not configured, return pending status
    if (!facturamaUser || !facturamaPassword || !restaurant?.fiscal_rfc) {
      return NextResponse.json({
        success: true,
        pending: true,
        message: 'Tu solicitud fue recibida. El restaurante procesará tu factura pronto.',
        cfdiId: cfdiRecord.id,
      });
    }

    // Facturama API integration
    try {
      const auth = Buffer.from(`${facturamaUser}:${facturamaPassword}`).toString('base64');

      const cfdiPayload = {
        Issuer: {
          FiscalRegime: restaurant.fiscal_regimen_fiscal ?? '601',
          Rfc: restaurant.fiscal_rfc,
          Name: restaurant.fiscal_razon_social ?? '',
        },
        Receiver: {
          Name: razonSocial.trim(),
          Rfc: rfc.trim().toUpperCase(),
          FiscalRegime: regimenFiscal.trim(),
          TaxZipCode: cpDomicilio?.trim() || restaurant.fiscal_lugar_expedicion || '',
          CfdiUse: cfdiUse,
        },
        CfdiType: 'I',
        NameId: '1',
        ExpeditionPlace: restaurant.fiscal_lugar_expedicion ?? cpDomicilio?.trim() ?? '',
        PaymentForm: '99',
        PaymentMethod: 'PPD',
        Items: [
          {
            ProductCode: '90101501',
            UnitCode: 'ACT',
            Unit: 'Actividad',
            Description: `Consumo en restaurante — Orden #${order.order_number}`,
            UnitPrice: Number(order.total),
            Quantity: 1,
            Subtotal: Number(order.total),
            Taxes: [],
            Total: Number(order.total),
          },
        ],
      };

      const facturamaRes = await fetch('https://api-lite.facturama.mx/3/cfdis', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cfdiPayload),
      });

      if (!facturamaRes.ok) {
        const errText = await facturamaRes.text();
        await supabase
          .from('cfdi_requests')
          .update({ status: 'error', error_message: errText })
          .eq('id', cfdiRecord.id);

        return NextResponse.json({
          success: true,
          pending: true,
          message: 'Tu solicitud fue recibida. El restaurante la procesará manualmente.',
          cfdiId: cfdiRecord.id,
        });
      }

      const facturamaData = await facturamaRes.json();
      const cfdiId: string = facturamaData.Id ?? facturamaData.id ?? '';

      // Download XML and PDF URLs
      const xmlUrl = cfdiId ? `https://api-lite.facturama.mx/cfdi/${cfdiId}/xml` : null;
      const pdfUrl = cfdiId ? `https://api-lite.facturama.mx/cfdi/${cfdiId}/pdf` : null;

      await supabase
        .from('cfdi_requests')
        .update({
          status: 'issued',
          facturama_id: cfdiId,
          xml_url: xmlUrl,
          pdf_url: pdfUrl,
        })
        .eq('id', cfdiRecord.id);

      return NextResponse.json({
        success: true,
        issued: true,
        xmlUrl,
        pdfUrl,
        cfdiId: cfdiRecord.id,
      });
    } catch (facturamaErr) {
      await supabase
        .from('cfdi_requests')
        .update({ status: 'error', error_message: String(facturamaErr) })
        .eq('id', cfdiRecord.id);

      return NextResponse.json({
        success: true,
        pending: true,
        message: 'Tu solicitud fue recibida. El restaurante procesará tu factura pronto.',
        cfdiId: cfdiRecord.id,
      });
    }
  } catch (err) {
    logger.error('Unexpected error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
