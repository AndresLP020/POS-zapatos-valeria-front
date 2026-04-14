'use client';

import { useEffect, useRef } from 'react';
import { formatoJsBarcode } from '@/lib/barcode-format';

type Props = {
  codigo: string;
  nombre?: string;
  className?: string;
};

/**
 * Vista previa del código de barras (canvas). Solo cliente.
 */
export function BarcodePreview({ codigo, nombre = '', className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const t = codigo.trim();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!t) return;

    let cancelled = false;
    (async () => {
      const JsBarcode = (await import('jsbarcode')).default;
      if (cancelled) return;
      const formato = formatoJsBarcode(t);
      try {
        JsBarcode(canvas, t, {
          format: formato,
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 11,
          margin: 4,
          background: '#ffffff',
        });
      } catch {
        try {
          JsBarcode(canvas, t, {
            format: 'CODE128',
            width: 1.6,
            height: 48,
            displayValue: true,
            fontSize: 10,
            margin: 4,
            background: '#ffffff',
          });
        } catch {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px sans-serif';
          ctx.fillText('Código no válido para barras', 8, 28);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [codigo]);

  if (!codigo.trim()) {
    return <p className={`text-slate-500 text-sm ${className}`}>Sin código</p>;
  }

  return (
    <div className={`bg-white rounded-lg p-2 inline-block ${className}`}>
      {nombre.trim() && (
        <p className="text-center text-slate-800 text-sm font-semibold mb-1 max-w-[320px] truncate">
          {nombre.trim()}
        </p>
      )}
      <canvas ref={ref} className="max-w-full h-auto" />
    </div>
  );
}
