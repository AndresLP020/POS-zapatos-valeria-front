'use client';

import { createContext, useContext, useCallback, useState } from 'react';

type AdminModeContextType = {
  isAdminMode: boolean;
  setAdminMode: (value: boolean) => void;
  entrarAdminMode: () => void;
  showMensajeIngreso: boolean;
  cerrarMensajeIngreso: () => void;
};

const AdminModeContext = createContext<AdminModeContextType | null>(null);

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const [isAdminMode, setState] = useState(false);
  const [showMensajeIngreso, setShowMensajeIngreso] = useState(false);

  const setAdminMode = useCallback((value: boolean) => {
    setState(value);
    if (!value) setShowMensajeIngreso(false);
  }, []);

  const entrarAdminMode = useCallback(() => {
    setState(true);
    setShowMensajeIngreso(true);
  }, []);

  const cerrarMensajeIngreso = useCallback(() => setShowMensajeIngreso(false), []);

  const value: AdminModeContextType = {
    isAdminMode,
    setAdminMode,
    entrarAdminMode,
    showMensajeIngreso,
    cerrarMensajeIngreso,
  };

  return (
    <AdminModeContext.Provider value={value}>
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  const ctx = useContext(AdminModeContext);
  if (!ctx) throw new Error('useAdminMode must be used within AdminModeProvider');
  return ctx;
}
