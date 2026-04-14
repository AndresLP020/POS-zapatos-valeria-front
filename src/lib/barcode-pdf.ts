import { formatoJsBarcode } from '@/lib/barcode-format';

export type OpcionesPdfEtiqueta = {
  codigo: string;
  nombreProducto: string;
  anchoMm: number;
  altoMm: number;
  copias: number;
};

/**
 * Genera un PDF con una o más páginas (una etiqueta por página) para imprimir código de barras.
 */
export async function generarPdfEtiquetas(opts: OpcionesPdfEtiqueta): Promise<void> {
  const codigo = opts.codigo.trim();
  if (!codigo) throw new Error('Código vacío');

  const [{ default: jsPDF }, JsBarcodeMod] = await Promise.all([import('jspdf'), import('jsbarcode')]);
  const JsBarcode = JsBarcodeMod.default;
  const formato = formatoJsBarcode(codigo);

  const w = Math.max(20, Math.min(120, opts.anchoMm));
  const h = Math.max(15, Math.min(150, opts.altoMm));
  const copias = Math.max(1, Math.min(500, Math.floor(opts.copias || 1)));

  const doc = new jsPDF({
    unit: 'mm',
    format: [w, h],
    orientation: w >= h ? 'landscape' : 'portrait',
    compress: true,
  });

  const dibujarEtiqueta = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 260;

    try {
      JsBarcode(canvas, codigo, {
        format: formato,
        width: formato === 'EAN13' ? 2.2 : 1.8,
        height: 70,
        displayValue: true,
        fontSize: 14,
        margin: 8,
        background: '#ffffff',
      });
    } catch {
      JsBarcode(canvas, codigo, {
        format: 'CODE128',
        width: 1.8,
        height: 70,
        displayValue: true,
        fontSize: 12,
        margin: 8,
        background: '#ffffff',
      });
    }

    const margin = 3;
    const maxW = w - margin * 2;
    const nombreReservado = opts.nombreProducto.trim() ? 7 : 2;
    const maxH = h - margin * 2 - nombreReservado;
    const cw = canvas.width;
    const ch = canvas.height;
    const ratio = ch / cw;
    let imgW = maxW;
    let imgH = imgW * ratio;
    if (imgH > maxH) {
      imgH = maxH;
      imgW = imgH / ratio;
    }
    const x = (w - imgW) / 2;
    const y = margin;
    const dataUrl = canvas.toDataURL('image/png');
    doc.addImage(dataUrl, 'PNG', x, y, imgW, imgH);

    if (opts.nombreProducto.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(Math.min(9, Math.max(6, w / 18)));
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(opts.nombreProducto.trim(), w - margin * 2);
      doc.text(lines, w / 2, y + imgH + 4, { align: 'center', maxWidth: w - margin * 2 });
    }
  };

  for (let i = 0; i < copias; i++) {
    if (i > 0) doc.addPage([w, h], w >= h ? 'l' : 'p');
    dibujarEtiqueta();
  }

  const safe = codigo.replace(/[^\dA-Za-z-_.]/g, '_').slice(0, 24);
  doc.save(`etiqueta-${safe || 'codigo'}.pdf`);
}
