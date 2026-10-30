import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { formatDate, formatFCFA } from '@/lib/format';

export const BRAND = rgb(0.06, 0.44, 0.4);
export const INK = rgb(0.13, 0.15, 0.18);
export const MUTED = rgb(0.42, 0.45, 0.5);
export const LINE = rgb(0.86, 0.88, 0.9);

/** pdf-lib (polices standard) encode en WinAnsi : on neutralise les caractères exotiques. */
export function sanitize(value: string): string {
  return value
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u202F\u00A0]/g, ' ')
    .replace(/\u20AC/g, 'EUR')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '');
}

export type PdfContext = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  width: number;
  height: number;
  y: number;
  margin: number;
};

export async function createPdf(): Promise<PdfContext> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  return { doc, page, font, bold, width, height, y: height - 56, margin: 48 };
}

export function text(
  ctx: PdfContext,
  value: string,
  options: {
    x?: number;
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    align?: 'left' | 'right' | 'center';
    lineGap?: number;
  } = {},
) {
  const size = options.size ?? 10;
  const font = options.bold ? ctx.bold : ctx.font;
  const content = sanitize(value);
  const textWidth = font.widthOfTextAtSize(content, size);
  let x = options.x ?? ctx.margin;
  if (options.align === 'right') x = ctx.width - ctx.margin - textWidth;
  if (options.align === 'center') x = (ctx.width - textWidth) / 2;

  ctx.page.drawText(content, {
    x,
    y: ctx.y,
    size,
    font,
    color: options.color ?? INK,
  });
  ctx.y -= size + (options.lineGap ?? 5);
}

export function paragraph(
  ctx: PdfContext,
  value: string,
  options: { size?: number; width?: number; color?: ReturnType<typeof rgb>; bold?: boolean } = {},
) {
  const size = options.size ?? 9.5;
  const font = options.bold ? ctx.bold : ctx.font;
  const maxWidth = options.width ?? ctx.width - ctx.margin * 2;
  const words = sanitize(value).split(/\s+/);
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      ctx.page.drawText(line, { x: ctx.margin, y: ctx.y, size, font, color: options.color ?? INK });
      ctx.y -= size + 4;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    ctx.page.drawText(line, { x: ctx.margin, y: ctx.y, size, font, color: options.color ?? INK });
    ctx.y -= size + 4;
  }
  ctx.y -= 4;
}

export function sectionTitle(ctx: PdfContext, value: string) {
  ctx.y -= 8;
  text(ctx, value.toUpperCase(), { size: 8.5, bold: true, color: BRAND, lineGap: 3 });
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y + 6 },
    end: { x: ctx.width - ctx.margin, y: ctx.y + 6 },
    thickness: 0.6,
    color: LINE,
  });
  ctx.y -= 4;
}

export function keyValues(
  ctx: PdfContext,
  rows: { label: string; value: string }[],
  options: { columns?: number; gap?: number } = {},
) {
  const columns = options.columns ?? 2;
  const columnWidth = (ctx.width - ctx.margin * 2) / columns;

  for (let index = 0; index < rows.length; index += columns) {
    const row = rows.slice(index, index + columns);
    const baseline = ctx.y;
    row.forEach((item, columnIndex) => {
      const x = ctx.margin + columnIndex * columnWidth;
      ctx.page.drawText(sanitize(item.label), {
        x,
        y: baseline,
        size: 7.5,
        font: ctx.font,
        color: MUTED,
      });
      ctx.page.drawText(sanitize(item.value), {
        x,
        y: baseline - 11,
        size: 9.5,
        font: ctx.bold,
        color: INK,
      });
    });
    ctx.y -= 28;
  }
}

export type TableColumn = { header: string; width: number; align?: 'left' | 'right' };

export function table(
  ctx: PdfContext,
  columns: TableColumn[],
  rows: string[][],
  options: { emptyLabel?: string } = {},
) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = (ctx.width - ctx.margin * 2) / totalWidth;
  const widths = columns.map((column) => column.width * scale);

  ctx.page.drawRectangle({
    x: ctx.margin,
    y: ctx.y - 4,
    width: ctx.width - ctx.margin * 2,
    height: 18,
    color: rgb(0.95, 0.97, 0.97),
  });

  let x = ctx.margin + 6;
  columns.forEach((column, index) => {
    const size = 7.5;
    const label = sanitize(column.header);
    const offset =
      column.align === 'right'
        ? widths[index] - 12 - ctx.bold.widthOfTextAtSize(label, size)
        : 0;
    ctx.page.drawText(label, { x: x + offset, y: ctx.y, size, font: ctx.bold, color: MUTED });
    x += widths[index];
  });
  ctx.y -= 20;

  if (rows.length === 0) {
    text(ctx, options.emptyLabel ?? 'Aucune ligne', { size: 9, color: MUTED });
    return;
  }

  for (const row of rows) {
    if (ctx.y < 90) break;
    let cellX = ctx.margin + 6;
    row.forEach((cell, index) => {
      const size = 8.5;
      const content = sanitize(cell);
      const maxWidth = widths[index] - 8;
      const truncated =
        ctx.font.widthOfTextAtSize(content, size) > maxWidth
          ? `${content.slice(0, Math.max(4, Math.floor(content.length * (maxWidth / ctx.font.widthOfTextAtSize(content, size))))) }…`.replace('…', '...')
          : content;
      const offset =
        columns[index]?.align === 'right'
          ? widths[index] - 12 - ctx.font.widthOfTextAtSize(truncated, size)
          : 0;
      ctx.page.drawText(truncated, { x: cellX + offset, y: ctx.y, size, font: ctx.font, color: INK });
      cellX += widths[index];
    });
    ctx.y -= 15;
    ctx.page.drawLine({
      start: { x: ctx.margin, y: ctx.y + 5 },
      end: { x: ctx.width - ctx.margin, y: ctx.y + 5 },
      thickness: 0.4,
      color: LINE,
    });
  }
  ctx.y -= 6;
}

export function totalRow(ctx: PdfContext, label: string, value: number, options: { emphasis?: boolean } = {}) {
  const y = ctx.y;
  ctx.page.drawLine({
    start: { x: ctx.margin, y: y + 14 },
    end: { x: ctx.width - ctx.margin, y: y + 14 },
    thickness: 0.6,
    color: LINE,
  });
  const size = options.emphasis ? 11 : 9.5;
  ctx.page.drawText(sanitize(label), {
    x: ctx.margin,
    y,
    size,
    font: options.emphasis ? ctx.bold : ctx.font,
    color: options.emphasis ? BRAND : INK,
  });
  const amount = sanitize(formatFCFA(value));
  ctx.page.drawText(amount, {
    x: ctx.width - ctx.margin - ctx.bold.widthOfTextAtSize(amount, size),
    y,
    size,
    font: ctx.bold,
    color: options.emphasis ? BRAND : INK,
  });
  ctx.y -= size + 12;
}

export function stamp(ctx: PdfContext, organizationName: string, subtitle: string) {
  const centerX = ctx.width - ctx.margin - 70;
  const centerY = Math.max(ctx.y - 30, 120);
  ctx.page.drawCircle({
    x: centerX,
    y: centerY,
    size: 44,
    borderColor: BRAND,
    borderWidth: 1.4,
    color: rgb(1, 1, 1),
    opacity: 0,
    borderOpacity: 0.85,
  });
  const name = sanitize(organizationName.slice(0, 22));
  ctx.page.drawText(name, {
    x: centerX - ctx.bold.widthOfTextAtSize(name, 7) / 2,
    y: centerY + 6,
    size: 7,
    font: ctx.bold,
    color: BRAND,
  });
  const line = sanitize(subtitle);
  ctx.page.drawText(line, {
    x: centerX - ctx.font.widthOfTextAtSize(line, 6) / 2,
    y: centerY - 4,
    size: 6,
    font: ctx.font,
    color: BRAND,
  });
  const mention = sanitize('CACHET / SIGNATURE');
  ctx.page.drawText(mention, {
    x: centerX - ctx.font.widthOfTextAtSize(mention, 5.5) / 2,
    y: centerY - 15,
    size: 5.5,
    font: ctx.font,
    color: BRAND,
  });
}

export async function drawHeader(
  ctx: PdfContext,
  options: {
    organizationName: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    documentTitle: string;
    documentNumber?: string;
    issuedAt?: Date;
  },
) {
  // Logo (data URL uniquement : évite toute dépendance réseau au moment du rendu)
  if (options.logoUrl?.startsWith('data:image/')) {
    try {
      const base64 = options.logoUrl.split(',')[1];
      const bytes = Buffer.from(base64, 'base64');
      const image = options.logoUrl.includes('image/png')
        ? await ctx.doc.embedPng(bytes)
        : await ctx.doc.embedJpg(bytes);
      const scaled = image.scale(0.35);
      const maxWidth = 90;
      const ratio = Math.min(1, maxWidth / scaled.width);
      ctx.page.drawImage(image, {
        x: ctx.margin,
        y: ctx.height - 56 - scaled.height * ratio + 12,
        width: scaled.width * ratio,
        height: scaled.height * ratio,
      });
    } catch {
      // logo illisible : on continue sans
    }
  }

  ctx.page.drawRectangle({ x: 0, y: ctx.height - 8, width: ctx.width, height: 8, color: BRAND });

  const left = options.logoUrl?.startsWith('data:image/') ? ctx.margin + 100 : ctx.margin;

  const name = sanitize(options.organizationName);
  ctx.page.drawText(name, { x: left, y: ctx.height - 62, size: 15, font: ctx.bold, color: BRAND });

  let infoY = ctx.height - 76;
  for (const info of [options.address, options.phone, options.email]) {
    if (!info) continue;
    ctx.page.drawText(sanitize(info), { x: left, y: infoY, size: 8, font: ctx.font, color: MUTED });
    infoY -= 10;
  }

  const title = sanitize(options.documentTitle.toUpperCase());
  const titleWidth = ctx.bold.widthOfTextAtSize(title, 12);
  ctx.page.drawText(title, {
    x: ctx.width - ctx.margin - titleWidth,
    y: ctx.height - 62,
    size: 12,
    font: ctx.bold,
    color: INK,
  });

  if (options.documentNumber) {
    const number = sanitize(options.documentNumber);
    ctx.page.drawText(number, {
      x: ctx.width - ctx.margin - ctx.font.widthOfTextAtSize(number, 9.5),
      y: ctx.height - 76,
      size: 9.5,
      font: ctx.font,
      color: MUTED,
    });
  }

  if (options.issuedAt) {
    const date = sanitize(`Émis le ${formatDate(options.issuedAt)}`);
    ctx.page.drawText(date, {
      x: ctx.width - ctx.margin - ctx.font.widthOfTextAtSize(date, 8),
      y: ctx.height - 88,
      size: 8,
      font: ctx.font,
      color: MUTED,
    });
  }

  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.height - 104 },
    end: { x: ctx.width - ctx.margin, y: ctx.height - 104 },
    thickness: 0.8,
    color: LINE,
  });
  ctx.y = ctx.height - 126;
}

export function footer(ctx: PdfContext, organizationName: string, mention: string) {
  const y = 46;
  ctx.page.drawLine({
    start: { x: ctx.margin, y: y + 14 },
    end: { x: ctx.width - ctx.margin, y: y + 14 },
    thickness: 0.5,
    color: LINE,
  });
  ctx.page.drawText(sanitize(`${organizationName} — ${mention}`), {
    x: ctx.margin,
    y,
    size: 7.5,
    font: ctx.font,
    color: MUTED,
  });
  const generated = sanitize(
    `Généré par monloyer.online le ${formatDate(new Date())} — montants en FCFA`,
  );
  ctx.page.drawText(generated, {
    x: ctx.width - ctx.margin - ctx.font.widthOfTextAtSize(generated, 7.5),
    y,
    size: 7.5,
    font: ctx.font,
    color: MUTED,
  });
}

export async function pdfResponse(ctx: PdfContext, fileName: string): Promise<Response> {
  const bytes = await ctx.doc.save();
  return new Response(bytes as BlobPart, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
