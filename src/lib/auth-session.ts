/** Marca que el usuario pasó por login (solo cliente). */
export const POS_SESSION_KEY = 'pos_authenticated';

export function setPosSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(POS_SESSION_KEY, '1');
}

export function clearPosSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(POS_SESSION_KEY);
}

export function hasPosSession(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(POS_SESSION_KEY) === '1';
}
