/** Dígito verificador EAN-13 (12 dígitos). */
export function ean13CheckDigit(digits12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

export function esEan13Valido(codigo: string): boolean {
  const s = codigo.trim();
  if (!/^\d{13}$/.test(s)) return false;
  return s[12] === ean13CheckDigit(s.slice(0, 12));
}

/** Formato soportado por JsBarcode para el valor almacenado en el producto. */
export function formatoJsBarcode(codigo: string): 'EAN13' | 'CODE128' {
  const t = codigo.trim();
  if (!t) return 'CODE128';
  if (/^\d{12}$/.test(t)) return 'EAN13';
  if (esEan13Valido(t)) return 'EAN13';
  return 'CODE128';
}
