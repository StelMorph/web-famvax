/* eslint-disable @typescript-eslint/no-var-requires */
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyHandlerV2,
} from 'aws-lambda';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Payload = {
  token: string;
  expiresAt: number; // kept in type, but we don't render it
  profile: { profileId: string; name: string };
  vaccine: {
    vaccineId: string;
    vaccineName: string;
    vaccineType?: string;
    date?: string;
    clinic?: string;
    dose?: string;
    lot?: string;
    nextDueDate?: string;
    notes?: string;
    sideEffects?: string;
  };
};

const pretty = (v: unknown) => {
  if (v === undefined || v === null) return '—';
  const s = String(v).trim();
  return s === '' ? '—' : s;
};

async function buildPdf(payload: Payload): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // layout + colors
  const margin = 56;
  let y = 841.89 - margin;
  const COL_LABEL = rgb(0.25, 0.28, 0.33); // dark gray for labels
  const COL_VALUE = rgb(0, 0, 0); // black for values
  const COL_TITLE = rgb(0.1, 0.1, 0.12); // near-black for title
  const labelX = margin;
  const valueX = margin + 130;

  // Title
  const title = 'FamVax — Vaccination Record';
  const titleSize = 26;
  y -= titleSize * 1.2;
  page.drawText(title, {
    x: margin,
    y,
    size: titleSize,
    font: helveticaBold,
    color: COL_TITLE,
  });

  // (Removed the “Expires in …” line)

  // small divider line
  y -= 14;
  page.drawLine({
    start: { x: margin, y },
    end: { x: 595.28 - margin, y },
    thickness: 0.75,
    color: rgb(0.75, 0.78, 0.81),
  });
  y -= 10;

  // rows
  const row = (label: string, value: unknown) => {
    const size = 13;
    const lh = size * 1.6;
    y -= lh;
    page.drawText(label, { x: labelX, y, size, font: helvetica, color: COL_LABEL });
    page.drawText(pretty(value), {
      x: valueX,
      y,
      size,
      font: helvetica,
      color: COL_VALUE,
    });
  };

  row('Profile', payload.profile.name);
  row('Vaccine', payload.vaccine.vaccineName);
  row('Type', payload.vaccine.vaccineType ?? '');
  row('Date', payload.vaccine.date ?? '');
  row('Dose', payload.vaccine.dose ?? '');
  row('Clinic', payload.vaccine.clinic ?? '');
  row('Lot', payload.vaccine.lot ?? '');
  row('Next due', payload.vaccine.nextDueDate ?? '');
  row('Notes', payload.vaccine.notes ?? '');
  row('Side Effects', payload.vaccine.sideEffects ?? '');

  return pdfDoc.save();
}

/* ---------------- Lambda handler ---------------- */

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const token = event.pathParameters?.token ?? '';
    if (!token || token.length < 5) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Invalid token',
      };
    }

    const explicitBase = process.env.PUBLIC_API_BASE?.replace(/\/+$/, '');
    const rctx: any = event.requestContext || {};
    const host = rctx.domainName || event.headers?.['x-forwarded-host'] || event.headers?.host;
    const stage = rctx.stage;
    const stagePath = stage && stage !== '$default' ? `/${stage}` : '';
    const inferredBase = explicitBase || (host ? `https://${host}${stagePath}` : '');

    if (!inferredBase) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Base URL cannot be inferred',
      };
    }

    const url = `${inferredBase}/public/vaccine/${encodeURIComponent(token)}?debug=1`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const preview = await resp.text().catch(() => '');
      return {
        statusCode: resp.status,
        headers: { 'Content-Type': 'text/plain' },
        body: preview || 'Not found',
      };
    }

    const payload = (await resp.json()) as Payload;
    const pdfBytes = await buildPdf(payload);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vaccine-record.pdf"`,
        'Cache-Control': 'no-store',
      },
      isBase64Encoded: true,
      body: Buffer.from(pdfBytes).toString('base64'),
    };
  } catch (err) {
    console.error('getPdf error', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Internal Server Error',
    };
  }
};
