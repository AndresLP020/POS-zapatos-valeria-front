'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { setPosSession } from '@/lib/auth-session';
import { GridScan } from '@/components/GridScan';

export default function HomePage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = usuario.trim();
    const pass = password.trim();
    if (!user || !pass) {
      setError('Ingrese usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(user, pass);
      setPosSession();
      router.push('/pos/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Usuario o contraseña incorrectos');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#030712] px-4 py-12">
      <div className="absolute inset-0 z-0">
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor="#2e4a8f"
          gridScale={0.13}
          scanColor="#8ec5ff"
          scanOpacity={0.45}
          enablePost
          bloomIntensity={0.7}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
          enableWebcam={false}
          showPreview={false}
          enableGyro={false}
          scanOnClick={false}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-slate-950/35 via-slate-950/55 to-slate-950/85" />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-elevated-lg mb-5 ring-4 ring-blue-400/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white animate-pulse drop-shadow-[0_0_18px_rgba(96,165,250,0.65)]">
            Punto de Venta <span className="text-cyan-300">Domking</span>
          </h1>
          <p className="text-blue-200/90 mt-2 text-sm font-medium">Tenis y zapatos</p>
          <p className="text-slate-300 text-xs mt-1">Inventario y ventas por pieza</p>
        </div>

        <div className="bg-blue-950/55 backdrop-blur-xl rounded-2xl shadow-elevated-lg border border-blue-700/40 p-8">
          <div className="border-b border-blue-800/50 pb-6 mb-6">
            <h2 className="text-lg font-semibold text-white">Iniciar sesión</h2>
            <p className="text-blue-200/80 text-sm mt-1">Ingrese sus credenciales para continuar</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="usuario" className="block text-sm font-medium text-blue-100 mb-2">
                Usuario
              </label>
              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-blue-700/50 bg-blue-900/35 focus:bg-blue-900/50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition text-white placeholder-blue-300/60"
                placeholder="Ej. administrador"
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-blue-700/50 bg-blue-900/35 focus:bg-blue-900/50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none transition text-white placeholder-blue-300/60"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-b from-blue-500 to-indigo-600 text-white font-semibold shadow-md hover:from-blue-600 hover:to-indigo-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          
        </div>

        <p className="mt-8 text-center text-xs text-slate-300 font-medium">
          Sistema de punto de venta · Versión 1.0
        </p>
      </div>
    </div>
  );
}
