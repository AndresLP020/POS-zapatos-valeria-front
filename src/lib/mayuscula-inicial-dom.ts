import { capitalizarPrimeraLetra } from '@/lib/utils';

const TIPOS_INPUT_OMITIR = new Set([
  'password',
  'email',
  'number',
  'search',
  'hidden',
  'range',
  'color',
  'file',
  'tel',
  'url',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
]);

/**
 * Campos de texto donde no debe forzarse mayúscula inicial (dinero, correo, contraseña, códigos, búsqueda, usuario, teléfono).
 * También se respeta data-no-inicial-mayuscula="1" en el elemento.
 */
export function debeOmitirMayusculaInicial(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el.readOnly || el.disabled) return true;
  const attr = el.getAttribute('data-no-inicial-mayuscula');
  if (attr === '1' || attr === 'true') return true;

  if (el instanceof HTMLInputElement && TIPOS_INPUT_OMITIR.has(el.type)) return true;

  const auto = (el.getAttribute('autocomplete') || '').toLowerCase();
  if (auto === 'email' || auto.includes('password') || auto === 'username' || auto === 'tel') return true;

  const inputMode = (el.getAttribute('inputmode') || '').toLowerCase();
  if (inputMode === 'decimal' || inputMode === 'numeric') return true;

  let labelText = '';
  if ('labels' in el && el.labels && el.labels.length) {
    labelText = Array.from(el.labels)
      .map((l) => l.textContent || '')
      .join(' ');
  }

  const blob = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.getAttribute('aria-label') || ''} ${labelText} ${el.className || ''}`.toLowerCase();

  if (/\b(buscar|búsqueda|search|filtro)\b/.test(blob)) return true;
  if (/\b(email|correo|mail|@)\b/.test(blob)) return true;
  if (/\b(contrase|password|pass)\b/.test(blob)) return true;
  if (/\b(monto|precio|costo|salario|sueldo|deuda|abono|total|propina|descuento|efectivo|importe)\b/.test(blob)) return true;
  if (/(c[oó]digo|barcode|sku|ean)/i.test(blob)) return true;
  if (/\b(telefono|teléfono|whatsapp|celular)\b/.test(blob)) return true;

  return false;
}

function setValorNativo(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc?.set) desc.set.call(el, value);
  else el.value = value;
}

export function aplicarMayusculaInicialSiCorresponde(el: HTMLInputElement | HTMLTextAreaElement) {
  if (debeOmitirMayusculaInicial(el)) return;
  const cur = el.value;
  const next = capitalizarPrimeraLetra(cur);
  if (next === cur) return;
  setValorNativo(el, next);
  try {
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  } catch {
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Listener en contenedor POS (p. ej. .pos-main-inner) para inputs/textarea controlados por React. */
export function attachMayusculaInicialPosMain(root: HTMLElement): () => void {
  const onFocusOut = (e: FocusEvent) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) && !(t instanceof HTMLTextAreaElement)) return;
    aplicarMayusculaInicialSiCorresponde(t);
  };
  root.addEventListener('focusout', onFocusOut, false);
  return () => root.removeEventListener('focusout', onFocusOut, false);
}
