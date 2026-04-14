/** Marca que el usuario pasó por login (solo cliente). */
export const POS_SESSION_KEY = 'pos_authenticated';
export const POS_USER_KEY = 'pos_user';

export type PosSessionUser = {
  id?: number;
  nombre: string;
  email?: string;
  role?: string;
};

export function setPosSession(user?: PosSessionUser): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(POS_SESSION_KEY, '1');
  if (user) sessionStorage.setItem(POS_USER_KEY, JSON.stringify(user));
}

export function clearPosSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(POS_SESSION_KEY);
  sessionStorage.removeItem(POS_USER_KEY);
}

export function hasPosSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(POS_SESSION_KEY) === '1';
}

export function getPosSessionUser(): PosSessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(POS_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PosSessionUser;
    if (!parsed?.nombre) return null;
    return parsed;
  } catch {
    return null;
  }
}
