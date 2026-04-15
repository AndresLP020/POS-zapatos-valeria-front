'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { getUsuarios, postUsuario, putUsuario, deleteUsuario, type Usuario } from '@/lib/api';

export default function ConfiguracionPage() {
  const { theme, setTheme } = useTheme();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre: '',
    telefono: '',
    rol: 'trabajador' as 'trabajador' | 'bodega',
  });
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getUsuarios();
      setUsuarios(u);
    } catch {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirModal = (u?: Usuario) => {
    setError('');
    if (u) {
      setEditingId(u.id);
      setForm({
        email: u.email,
        password: '',
        nombre: u.nombre,
        telefono: u.telefono || '',
        rol: (u.rol === 'bodega' ? 'bodega' : 'trabajador') as 'trabajador' | 'bodega',
      });
    } else {
      setEditingId(null);
      setForm({
        email: '',
        password: '',
        nombre: '',
        telefono: '',
        rol: 'trabajador' as 'trabajador' | 'bodega',
      });
    }
    setModalUsuario(true);
  };

  const cerrarModal = () => {
    setModalUsuario(false);
    setEditingId(null);
    setError('');
  };

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim()) {
      setError('El correo es obligatorio');
      return;
    }
    if (!editingId && !form.password) {
      setError('La contraseña es obligatoria para nuevos usuarios');
      return;
    }
    try {
      if (editingId) {
        await putUsuario(editingId, {
          email: form.email.trim(),
          ...(form.password ? { password: form.password } : undefined),
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || undefined,
          rol: form.rol,
        });
      } else {
        await postUsuario({
          email: form.email.trim(),
          password: form.password,
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || undefined,
          rol: form.rol,
        });
      }
      await cargarDatos();
      cerrarModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const eliminarUsuario = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await deleteUsuario(id);
      await cargarDatos();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col min-h-full text-white">
      <header className="sticky top-0 z-10 px-6 py-4 border-b border-blue-800/45 bg-blue-950/75 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Usuarios, permisos y apariencia</p>
      </header>

      <div className="flex-1 p-6 space-y-8">
        {/* Apariencia - Modo oscuro */}
        <section className="rounded-2xl bg-blue-950/55 backdrop-blur-md border border-blue-800/45 p-6 shadow-elevated">
          <h2 className="text-lg font-semibold text-white mb-1">Apariencia</h2>
          <p className="text-slate-400 text-sm mb-4">Activa o desactiva el modo oscuro de la página.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-blue-950 ${
                theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-white">
              Modo oscuro {theme === 'dark' ? 'activado' : 'desactivado'}
            </span>
          </div>
        </section>

        {/* Usuarios */}
        <section className="rounded-2xl bg-blue-950/55 backdrop-blur-md border border-blue-800/45 overflow-hidden shadow-elevated">
          <div className="px-6 py-4 border-b border-blue-800/45 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Usuarios del sistema</h2>
              <p className="text-slate-400 text-sm mt-0.5">Correo, contraseña, nombre, teléfono y permisos sobre el punto de venta</p>
            </div>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar usuario
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Cargando usuarios…</div>
          ) : usuarios.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="font-medium">No hay usuarios agregados.</p>
              <p className="text-sm mt-1">Agrega usuarios para gestionar permisos en el punto de venta.</p>
              <button onClick={() => abrirModal()} className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">
                Agregar usuario
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-800/40 bg-blue-950/20 backdrop-blur-sm">
                    <th className="text-left text-slate-400 font-semibold px-6 py-4">Nombre</th>
                    <th className="text-left text-slate-400 font-semibold px-6 py-4">Correo</th>
                    <th className="text-left text-slate-400 font-semibold px-6 py-4">Teléfono</th>
                    <th className="text-left text-slate-400 font-semibold px-6 py-4">Rol</th>
                    <th className="text-left text-slate-400 font-semibold px-6 py-4">Permisos</th>
                    <th className="text-right text-slate-400 font-semibold px-6 py-4 w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-b border-blue-900/35 hover:bg-blue-900/25">
                      <td className="px-6 py-3 text-white font-medium">{u.nombre || '—'}</td>
                      <td className="px-6 py-3 text-slate-300">{u.email}</td>
                      <td className="px-6 py-3 text-slate-400">{u.telefono || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${u.rol === 'bodega' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-500/20 text-slate-300'}`}>
                          {u.rol === 'bodega' ? 'Bodega' : 'Trabajador'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="flex flex-wrap gap-1">
                          {u.permisos.hacerVentas && <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">Ventas</span>}
                          {u.permisos.darDeBajaProductos && <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 text-xs">Dar de baja</span>}
                          {u.permisos.actualizarProductos && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">Actualizar prod.</span>}
                          {u.permisos.borrarProductos && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">Borrar prod.</span>}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => abrirModal(u)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-600 hover:text-white mr-1" title="Editar">✎</button>
                        <button onClick={() => eliminarUsuario(u.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400" title="Eliminar">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal usuario */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={cerrarModal}>
          <div className="bg-blue-950/40 backdrop-blur-md rounded-2xl border border-blue-800/40 shadow-elevated-lg w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-blue-800/40">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Editar usuario' : 'Agregar usuario'}</h2>
            </div>
            <form onSubmit={guardarUsuario} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-1">Correo *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl bg-slate-700 border border-blue-800/40 px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-1">
                  Contraseña {editingId ? '(dejar en blanco para no cambiar)' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-xl bg-slate-700 border border-blue-800/40 px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder={editingId ? '••••••••' : ''}
                  required={!editingId}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full rounded-xl bg-slate-700 border border-blue-800/40 px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  className="w-full rounded-xl bg-slate-700 border border-blue-800/40 px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-1">Rol del usuario</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as 'trabajador' | 'bodega' }))}
                  className="w-full rounded-xl bg-slate-700 border border-blue-800/40 px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="trabajador">Trabajador (tienda)</option>
                  <option value="bodega">Bodega</option>
                </select>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrarModal} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600">
                  {editingId ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
