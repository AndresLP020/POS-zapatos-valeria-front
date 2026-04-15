'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProductos, type Producto } from '@/lib/api';
import { useAdminMode } from '@/contexts/AdminModeContext';
import { BarcodePreview } from '@/components/BarcodePreview';
import { generarPdfEtiquetas } from '@/lib/barcode-pdf';

export default function CodigosProductosPage() {
  const router = useRouter();
  const { isAdminMode } = useAdminMode();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [anchoMm, setAnchoMm] = useState(50);
  const [altoMm, setAltoMm] = useState(30);
  const [copias, setCopias] = useState(1);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState('');

  useEffect(() => {
    if (!isAdminMode) {
      router.replace('/pos/dashboard');
    }
  }, [isAdminMode, router]);

  const cargar = useCallback(() => {
    setCargando(true);
    getProductos()
      .then(setProductos)
      .catch(() => setProductos([]))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (isAdminMode) cargar();
  }, [isAdminMode, cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo || '').toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    });
  }, [productos, busqueda]);

  const seleccionado = useMemo(
    () => (seleccionId != null ? productos.find((p) => p.id === seleccionId) ?? null : null),
    [productos, seleccionId]
  );

  const descargarPdf = async () => {
    if (!seleccionado?.codigo?.trim()) {
      setErrorPdf('El producto no tiene código de barras.');
      return;
    }
    setErrorPdf('');
    setGenerandoPdf(true);
    try {
      await generarPdfEtiquetas({
        codigo: seleccionado.codigo.trim(),
        nombreProducto: seleccionado.nombre,
        anchoMm,
        altoMm,
        copias,
      });
    } catch (e) {
      setErrorPdf(e instanceof Error ? e.message : 'No se pudo generar el PDF');
    } finally {
      setGenerandoPdf(false);
    }
  };

  if (!isAdminMode) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-400">
        Redirigiendo…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-white max-w-6xl mx-auto w-full">
      <div className="px-1 sm:px-0 py-2 border-b border-blue-800/45 mb-4">
        <h1 className="text-2xl font-bold text-white">Códigos de productos</h1>
        <p className="text-slate-400 text-sm mt-1">
          Vista previa de códigos de barras y PDF de etiquetas para impresión (solo administrador).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="flex flex-col rounded-2xl border border-blue-800/40 bg-blue-950/40 backdrop-blur-sm overflow-hidden">
          <div className="p-4 border-b border-blue-800/40">
            <label className="block text-slate-400 text-xs font-medium mb-1">Buscar</label>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, código o categoría…"
              className="w-full rounded-xl bg-slate-700 border border-blue-800/40 px-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-[60vh] lg:max-h-[calc(100vh-280px)] p-2 space-y-1">
            {cargando ? (
              <p className="text-slate-500 text-sm p-3">Cargando productos…</p>
            ) : filtrados.length === 0 ? (
              <p className="text-slate-500 text-sm p-3">No hay productos que coincidan.</p>
            ) : (
              filtrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSeleccionId(p.id)}
                  className={`w-full text-left rounded-xl px-3 py-3 border transition ${
                    seleccionId === p.id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                      : 'bg-blue-950/50 backdrop-blur-md border-blue-800/40 hover:border-blue-700/50 text-slate-200'
                  }`}
                >
                  <div className="font-medium truncate">{p.nombre}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{p.codigo || 'Sin código'}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-800/40 bg-blue-950/40 backdrop-blur-sm p-5 space-y-5">
          {!seleccionado ? (
            <p className="text-slate-500 text-sm">Selecciona un producto de la lista para ver su código y generar el PDF.</p>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-white truncate">{seleccionado.nombre}</h2>
                <p className="text-slate-400 text-sm font-mono mt-1">{seleccionado.codigo || 'Sin código'}</p>
              </div>

              {seleccionado.codigo?.trim() ? (
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-2">Vista previa</p>
                  <BarcodePreview codigo={seleccionado.codigo} nombre={seleccionado.nombre} />
                </div>
              ) : (
                <p className="text-amber-400/90 text-sm">Este producto no tiene código. Edítalo en Productos o genera uno nuevo.</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1">Ancho etiqueta (mm)</label>
                  <input
                    type="number"
                    min={20}
                    max={120}
                    step={1}
                    value={anchoMm}
                    onChange={(e) => setAnchoMm(Number(e.target.value) || 50)}
                    className="w-full rounded-xl bg-slate-700 border border-blue-800/40 px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1">Alto etiqueta (mm)</label>
                  <input
                    type="number"
                    min={15}
                    max={150}
                    step={1}
                    value={altoMm}
                    onChange={(e) => setAltoMm(Number(e.target.value) || 30)}
                    className="w-full rounded-xl bg-slate-700 border border-blue-800/40 px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">Páginas / copias en el PDF</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={copias}
                  onChange={(e) => setCopias(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  className="w-full max-w-[160px] rounded-xl bg-slate-700 border border-blue-800/40 px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-slate-500 text-xs mt-1">Cada copia es una página del mismo tamaño para imprimir varias etiquetas.</p>
              </div>

              {errorPdf && <p className="text-red-400 text-sm">{errorPdf}</p>}

              <button
                type="button"
                disabled={!seleccionado.codigo?.trim() || generandoPdf}
                onClick={descargarPdf}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition"
              >
                {generandoPdf ? 'Generando…' : 'Descargar PDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
