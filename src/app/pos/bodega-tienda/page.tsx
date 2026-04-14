'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getInventarioUbicaciones,
  getMovimientosInventario,
  getSolicitudesInventario,
  postSolicitudInventario,
  postAutorizarSolicitudInventario,
  postTransferirInventario,
  type InventarioUbicacionItem,
  type MovimientoInventario,
} from '@/lib/api';
import { formatearCantidad } from '@/lib/utils';
import { getPosSessionUser, type PosSessionUser } from '@/lib/auth-session';

export default function BodegaTiendaPage() {
  const [usuarioSesion, setUsuarioSesion] = useState<PosSessionUser | null>(null);
  const canManageBodega = usuarioSesion?.role === 'bodega' || usuarioSesion?.role === 'admin';
  const isTrabajador = usuarioSesion?.role === 'trabajador';
  const [items, setItems] = useState<InventarioUbicacionItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<MovimientoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovs, setLoadingMovs] = useState(true);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [productoId, setProductoId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState('');
  const [solicitadoPor, setSolicitadoPor] = useState('');
  const [recogidoPor, setRecogidoPor] = useState('');
  const [autorizadoPor, setAutorizadoPor] = useState('');
  const [tipoOperacionBodega, setTipoOperacionBodega] = useState<'salida' | 'entrada'>('salida');
  const [entradaProductoId, setEntradaProductoId] = useState<number | ''>('');
  const [entradaCantidad, setEntradaCantidad] = useState('');
  const [entregaTiendaPor, setEntregaTiendaPor] = useState('');
  const [recibeBodegaPor, setRecibeBodegaPor] = useState('');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [autorizandoId, setAutorizandoId] = useState<number | null>(null);
  const [registrandoEntrada, setRegistrandoEntrada] = useState(false);
  const [error, setError] = useState('');

  const cargarInventario = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getInventarioUbicaciones());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarMovimientos = useCallback(async () => {
    setLoadingMovs(true);
    try {
      setMovimientos(await getMovimientosInventario(150));
    } catch {
      setMovimientos([]);
    } finally {
      setLoadingMovs(false);
    }
  }, []);

  const cargarSolicitudes = useCallback(async () => {
    setLoadingSolicitudes(true);
    try {
      setSolicitudesPendientes(await getSolicitudesInventario('solicitado', 200));
    } catch {
      setSolicitudesPendientes([]);
    } finally {
      setLoadingSolicitudes(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([cargarInventario(), cargarMovimientos(), cargarSolicitudes()]);
  }, [cargarInventario, cargarMovimientos, cargarSolicitudes]);

  useEffect(() => {
    setUsuarioSesion(getPosSessionUser());
  }, []);

  useEffect(() => {
    const nombre = usuarioSesion?.nombre || '';
    setSolicitadoPor((v) => v || nombre);
    setRecogidoPor((v) => v || nombre);
    setAutorizadoPor((v) => v || nombre);
    setEntregaTiendaPor((v) => v || nombre);
    setRecibeBodegaPor((v) => v || nombre);
  }, [usuarioSesion?.nombre]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q)
    );
  }, [items, busqueda]);

  const movimientosVisibles = useMemo(() => {
    if (!isTrabajador) return movimientos;
    const nombre = (usuarioSesion?.nombre || '').trim().toLowerCase();
    const uid = usuarioSesion?.id;
    return movimientos.filter((m) => {
      const byId = uid != null && m.solicitadoPorId != null && m.solicitadoPorId === uid;
      const byName = !!nombre && (m.solicitadoPor || '').trim().toLowerCase() === nombre;
      return byId || byName;
    });
  }, [movimientos, isTrabajador, usuarioSesion?.id, usuarioSesion?.nombre]);

  const productoSel = useMemo(
    () => (productoId === '' ? null : items.find((p) => p.id === productoId) || null),
    [items, productoId]
  );

  const solicitarDesdeTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const qty = Math.max(0, Math.floor(Number(cantidad) || 0));
    if (!productoId) return setError('Selecciona un producto');
    if (qty <= 0) return setError('Ingresa una cantidad válida');
    if (!solicitadoPor.trim()) return setError('Indica quién solicita en tienda');
    if (!recogidoPor.trim()) return setError('Indica quién recogerá en bodega');
    setEnviandoSolicitud(true);
    try {
      await postSolicitudInventario({
        productoId,
        cantidad: qty,
        solicitadoPorId: usuarioSesion?.id,
        solicitadoPor: solicitadoPor.trim(),
        recogidoPorId: usuarioSesion?.id,
        recogidoPor: recogidoPor.trim(),
      });
      setCantidad('');
      await Promise.all([cargarSolicitudes(), cargarMovimientos()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la solicitud');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const autorizarSalidaBodega = async (solicitud: MovimientoInventario) => {
    setError('');
    if (!autorizadoPor.trim()) return setError('Indica quién autoriza en bodega');
    if (!canManageBodega) return setError('Solo usuarios con rol bodega o admin pueden autorizar salidas');
    setAutorizandoId(solicitud.id);
    try {
      await postAutorizarSolicitudInventario(solicitud.id, {
        autorizadoPorId: usuarioSesion?.id,
        autorizadoPor: autorizadoPor.trim(),
        actorRole: usuarioSesion?.role,
      });
      await Promise.all([cargarInventario(), cargarSolicitudes(), cargarMovimientos()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo autorizar la salida');
    } finally {
      setAutorizandoId(null);
    }
  };

  const registrarEntradaDesdeTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canManageBodega) return setError('Solo usuarios con rol bodega o admin pueden recibir entradas en bodega');
    const qty = Math.max(0, Math.floor(Number(entradaCantidad) || 0));
    if (!entradaProductoId) return setError('Selecciona un producto para entrada');
    if (qty <= 0) return setError('Ingresa una cantidad válida para entrada');
    if (!entregaTiendaPor.trim() || !recibeBodegaPor.trim()) {
      return setError('Indica quién entrega desde tienda y quién recibe en bodega');
    }
    const producto = items.find((p) => p.id === entradaProductoId);
    if (!producto) return setError('Producto no encontrado');
    if (qty > producto.stockTienda) {
      return setError(`No puedes ingresar más de lo que hay en tienda física (${formatearCantidad(producto.stockTienda)})`);
    }
    setRegistrandoEntrada(true);
    try {
      await postTransferirInventario({
        productoId: entradaProductoId,
        cantidad: qty,
        origen: 'tienda',
        destino: 'bodega',
        solicitadoPorId: usuarioSesion?.id,
        solicitadoPor: entregaTiendaPor.trim(),
        autorizadoPorId: usuarioSesion?.id,
        autorizadoPor: recibeBodegaPor.trim(),
        recogidoPorId: undefined,
        recogidoPor: '',
        actorRole: usuarioSesion?.role,
      });
      setEntradaCantidad('');
      await Promise.all([cargarInventario(), cargarMovimientos()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar entrada en bodega');
    } finally {
      setRegistrandoEntrada(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-white">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-700 bg-slate-800/50">
        <h1 className="text-xl sm:text-2xl font-bold">Bodega y tienda física</h1>
        <p className="text-slate-400 text-sm mt-1">
          Flujo dividido: tienda solicita, bodega autoriza salida y se registra quién recoge.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Stock total</p>
            <p className="text-2xl font-bold mt-1">{formatearCantidad(items.reduce((s, p) => s + p.stockTotal, 0))}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide">En bodega</p>
            <p className="text-2xl font-bold mt-1 text-amber-400">{formatearCantidad(items.reduce((s, p) => s + p.stockBodega, 0))}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wide">En tienda física</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">{formatearCantidad(items.reduce((s, p) => s + p.stockTienda, 0))}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-emerald-200">Parte 1 · Tienda solicita a bodega</h2>
            <p className="text-emerald-100/80 text-sm mt-1">Un trabajador de tienda crea la solicitud y define quién irá a recoger el producto.</p>
            <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-100/90">
              <strong>Guía rápida:</strong> quien llena este bloque es personal de tienda. Debe indicar:
              solicitante (quien pide), recolector (quien va a bodega) y cantidad.
            </div>
            <form onSubmit={solicitarDesdeTienda} className="mt-4 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Producto</label>
                <select
                  value={productoId === '' ? '' : productoId}
                  onChange={(e) => setProductoId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.codigo || 'sin código'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Cantidad</label>
                  <input type="number" min={1} step={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Solicitante (empleado de tienda)</label>
                  <input
                    type="text"
                    value={solicitadoPor}
                    onChange={(e) => setSolicitadoPor(e.target.value)}
                    className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none"
                    placeholder="Ej. Valeria (cajera)"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Recolector (quién irá a bodega)</label>
                  <input
                    type="text"
                    value={recogidoPor}
                    onChange={(e) => setRecogidoPor(e.target.value)}
                    className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none"
                    placeholder="Ej. Andrés (mensajero)"
                  />
                </div>
              </div>
              {productoSel && (
                <p className="text-xs text-slate-300">
                  Disponible en bodega: <span className="font-semibold text-white">{formatearCantidad(productoSel.stockBodega)}</span>
                </p>
              )}
              <button type="submit" disabled={enviandoSolicitud} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition">
                {enviandoSolicitud ? 'Registrando...' : 'Registrar solicitud'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-amber-200">Parte 2 · Bodega autoriza salida</h2>
            <p className="text-amber-100/80 text-sm mt-1">Personal de bodega puede seleccionar si registra una salida o una entrada.</p>
            {!canManageBodega ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-slate-900/50 p-4 text-sm text-amber-100">
                Este apartado es solo para usuarios con rol <strong>bodega</strong> o <strong>admin</strong>.
              </div>
            ) : (
              <>
            <div className="mt-3">
              <label className="block text-slate-300 text-sm mb-1">Tipo de movimiento en bodega</label>
              <select
                value={tipoOperacionBodega}
                onChange={(e) => setTipoOperacionBodega(e.target.value as 'salida' | 'entrada')}
                className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none"
              >
                <option value="salida">Salida de bodega (autorizar solicitud a tienda)</option>
                <option value="entrada">Entrada a bodega (recibir devolución/retorno de tienda)</option>
              </select>
            </div>
            <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-900/20 px-3 py-2 text-xs text-amber-100/90">
              <strong>Guía rápida:</strong> selecciona el tipo de operación para registrar correctamente entrada o salida.
            </div>
            {tipoOperacionBodega === 'salida' ? (
              <>
                <div className="mt-3">
                  <label className="block text-slate-300 text-sm mb-1">Autorizador (encargado de bodega)</label>
                  <input
                    type="text"
                    value={autorizadoPor}
                    onChange={(e) => setAutorizadoPor(e.target.value)}
                    className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none"
                    placeholder="Ej. Juan (encargado bodega)"
                  />
                </div>
                <div className="mt-4 max-h-[320px] overflow-auto space-y-2 pr-1">
                  {loadingSolicitudes ? (
                    <p className="text-slate-400 text-sm">Cargando solicitudes…</p>
                  ) : solicitudesPendientes.length === 0 ? (
                    <p className="text-slate-400 text-sm">No hay solicitudes pendientes.</p>
                  ) : (
                    solicitudesPendientes.map((s) => (
                      <div key={s.id} className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                        <p className="text-sm font-semibold text-white">{s.productoNombre} · {formatearCantidad(s.cantidad)}</p>
                        <p className="text-xs text-slate-300 mt-1">Solicitante tienda: {s.solicitadoPor || '-'} · Recolector: {s.recogidoPor || '-'}</p>
                        <button
                          type="button"
                          onClick={() => autorizarSalidaBodega(s)}
                          disabled={autorizandoId === s.id}
                          className="mt-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {autorizandoId === s.id ? 'Autorizando...' : 'Autorizar salida'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={registrarEntradaDesdeTienda} className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-slate-300 text-sm mb-1">Producto</label>
                  <select
                    value={entradaProductoId === '' ? '' : entradaProductoId}
                    onChange={(e) => setEntradaProductoId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} · tienda: {formatearCantidad(p.stockTienda)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Cantidad</label>
                  <input type="number" min={1} step={1} value={entradaCantidad} onChange={(e) => setEntradaCantidad(e.target.value)} className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Entrega (tienda)</label>
                  <input type="text" value={entregaTiendaPor} onChange={(e) => setEntregaTiendaPor(e.target.value)} className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Recibe (bodega)</label>
                  <input type="text" value={recibeBodegaPor} onChange={(e) => setRecibeBodegaPor(e.target.value)} className="w-full rounded-xl bg-slate-700 border border-slate-600 px-3 py-2.5 text-white outline-none" />
                </div>
                <div className="md:col-span-5">
                  <button type="submit" disabled={registrandoEntrada} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition">
                    {registrandoEntrada ? 'Registrando entrada...' : 'Registrar entrada a bodega'}
                  </button>
                </div>
              </form>
            )}
              </>
            )}
          </section>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            {isTrabajador ? 'Mis solicitudes y movimientos' : 'Historial de solicitudes y salidas'}
          </h2>
          {isTrabajador && (
            <p className="text-slate-400 text-sm mt-1">
              Como trabajador, solo puedes ver los movimientos solicitados por tu usuario.
            </p>
          )}
          <div className="mt-3 max-h-[360px] overflow-auto space-y-2 pr-1">
            {loadingMovs ? (
              <p className="text-slate-500 text-sm">Cargando historial…</p>
            ) : movimientosVisibles.length === 0 ? (
              <p className="text-slate-500 text-sm">Sin movimientos registrados.</p>
            ) : (
              movimientosVisibles.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                  <p className="text-sm font-medium text-white">{m.productoNombre}</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Estado: {m.estado === 'solicitado' ? 'Solicitado' : 'Autorizado'} · {m.origen} → {m.destino} · Cantidad: {formatearCantidad(m.cantidad)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Solicita: {m.solicitadoPor || '-'} · Autoriza: {m.autorizadoPor || '-'} · Recoge: {m.recogidoPor || '-'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(m.fecha).toLocaleString('es-MX')}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold">Existencias por producto</h2>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto, código o categoría…"
              className="w-full sm:w-[340px] rounded-xl bg-slate-700 border border-slate-600 px-3 py-2 text-white placeholder-slate-500 outline-none"
            />
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3">Código</th>
                  <th className="py-2 pr-3">Categoría</th>
                  <th className="py-2 pr-3">Bodega</th>
                  <th className="py-2 pr-3">Tienda</th>
                  <th className="py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="py-3 text-slate-500" colSpan={6}>Cargando inventario…</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td className="py-3 text-slate-500" colSpan={6}>No se encontraron productos.</td></tr>
                ) : (
                  filtrados.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800">
                      <td className="py-2 pr-3 text-white">{p.nombre}</td>
                      <td className="py-2 pr-3 font-mono text-slate-300">{p.codigo || '-'}</td>
                      <td className="py-2 pr-3 text-slate-300">{p.categoria || '-'}</td>
                      <td className="py-2 pr-3 text-amber-300 font-semibold">{formatearCantidad(p.stockBodega)}</td>
                      <td className="py-2 pr-3 text-emerald-300 font-semibold">{formatearCantidad(p.stockTienda)}</td>
                      <td className="py-2 text-white font-semibold">{formatearCantidad(p.stockTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
